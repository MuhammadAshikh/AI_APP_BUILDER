import { DurableObject, WorkerEntrypoint } from "cloudflare:workers";

type ProjectFile = {
  path: string;
  content: string;
};

type StoredProject = {
  id: string;
  user_id: string;
  files: string;
};

type PreviewEnvironment = {
  PROJECTS_DB: HamshakeD1Database;
  PREVIEW_CONTAINERS: {
    getByName(name: string): PreviewContainerStub;
  };
};

type PreviewContainerStub = {
  syncProject(version: string, files: ProjectFile[]): Promise<void>;
  fetch(request: Request): Promise<Response>;
};

const PREVIEW_COOKIE = "__Host-hamshake_preview";
const PREVIEW_AUTH_PATH = "/__hamshake_auth";
const PREVIEW_HOST_PATTERN = /^p-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.hamshake\.com$/i;
const MAX_FILES = 24;
const MAX_FILE_CHARACTERS = 16_000;
const MAX_TOTAL_CHARACTERS = 50_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PREVIEW_AUTH_PAGE = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Opening preview</title></head>
  <body>
    <p id="status">Opening your Hamshake preview…</p>
    <script>
      const token = location.hash.slice(1);
      history.replaceState(null, "", location.pathname + location.search);
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        document.getElementById("status").textContent = "Open this preview from your Hamshake project.";
      } else {
        fetch("${PREVIEW_AUTH_PATH}", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "text/plain" },
          body: token
        }).then((response) => {
          if (!response.ok) throw new Error();
          location.replace(location.pathname + location.search);
        }).catch(() => {
          document.getElementById("status").textContent = "This preview link is invalid or has expired.";
        });
      }
    </script>
  </body>
</html>`;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function textResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function bootstrapResponse(): Response {
  return new Response(PREVIEW_AUTH_PAGE, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors https://www.hamshake.com",
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function readPreviewToken(request: Request): Promise<string | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "text/plain") return null;
  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 64) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (length !== 64) return null;

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const token = decoder.decode(bytes);
  return /^[a-f0-9]{64}$/i.test(token) ? token : null;
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return null;
}

function removeControlCookies(headers: Headers): void {
  const cookie = headers.get("cookie");
  if (!cookie) return;

  const retained = cookie.split(";").filter((part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return false;
    const name = part.slice(0, separator).trim().toLowerCase();
    return name !== PREVIEW_COOKIE.toLowerCase() && name !== "hamshake_session";
  });
  if (retained.length > 0) headers.set("cookie", retained.join("; "));
  else headers.delete("cookie");
}

function validateFiles(serializedFiles: string): ProjectFile[] {
  const parsed: unknown = JSON.parse(serializedFiles);
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_FILES) {
    throw new Error("The project must contain between 1 and 24 source files.");
  }

  let totalCharacters = 0;
  const files: ProjectFile[] = [];
  const paths = new Set<string>();
  for (const value of parsed) {
    if (typeof value !== "object" || value === null) {
      throw new Error("The project contains an invalid source file.");
    }
    const file = value as Record<string, unknown>;
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      throw new Error("The project contains an invalid source file.");
    }

    const segments = file.path.split("/");
    const invalidPath =
      file.path.length === 0 ||
      file.path.startsWith("/") ||
      file.path.includes("\\") ||
      !/^[A-Za-z0-9@._/-]+$/.test(file.path) ||
      segments.some((segment) => !segment || segment === "." || segment === "..") ||
      segments.some((segment) => ["node_modules", ".git", ".next", ".wrangler"].includes(segment)) ||
      /^\.env(?:\.|$)/i.test(segments[segments.length - 1]) ||
      [".npmrc", ".yarnrc", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock"]
        .includes(segments[segments.length - 1].toLowerCase());
    if (invalidPath) {
      throw new Error(`The project contains a path that cannot be previewed: ${file.path}`);
    }
    if (paths.has(file.path)) {
      throw new Error(`The project contains duplicate source paths: ${file.path}`);
    }
    paths.add(file.path);
    if (file.content.length > MAX_FILE_CHARACTERS) {
      throw new Error(`The project file ${file.path} exceeds the preview size limit.`);
    }

    totalCharacters += file.content.length;
    files.push({ path: file.path, content: file.content });
  }

  if (totalCharacters > MAX_TOTAL_CHARACTERS) {
    throw new Error("The project source exceeds the preview size limit.");
  }
  const packageFile = files.find((file) => file.path === "package.json");
  if (!packageFile) {
    throw new Error("The project is missing package.json.");
  }
  validatePackageJson(packageFile.content);
  return files;
}

function validatePackageJson(content: string): Record<string, string> {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("The project has an invalid package.json.");
  }
  if (typeof value !== "object" || value === null) {
    throw new Error("The project has an invalid package.json.");
  }

  const packageJson = value as Record<string, unknown>;
  const dependencies: Record<string, string> = {};
  for (const section of ["dependencies", "devDependencies"]) {
    const entries = packageJson[section];
    if (entries === undefined) continue;
    if (typeof entries !== "object" || entries === null || Array.isArray(entries)) {
      throw new Error(`The project has an invalid ${section} section.`);
    }
    for (const [name, version] of Object.entries(entries)) {
      if (typeof version !== "string") {
        throw new Error(`The npm dependency ${name} must use a version from the public npm registry.`);
      }
      dependencies[name] = version;
    }
  }

  const entries = Object.entries(dependencies);
  if (entries.length > 64) {
    throw new Error("The project has too many npm dependencies to preview.");
  }
  for (const [name, version] of entries) {
    if (
      !/^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name) ||
      version.length > 64 ||
      !/^[~^]?\d+(?:\.\d+){0,2}(?:-[0-9a-zA-Z.-]+)?$/.test(version)
    ) {
      throw new Error(`The npm dependency ${name} must use a version from the public npm registry.`);
    }
  }
  if (!dependencies.next || !dependencies.react || !dependencies["react-dom"]) {
    throw new Error("The project must include Next.js, React, and React DOM.");
  }
  return dependencies;
}

async function loadProject(
  env: PreviewEnvironment,
  projectId: string,
  token: string
): Promise<StoredProject | null> {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  const tokenHash = await sha256(token);
  return env.PROJECTS_DB
    .prepare(
      `SELECT projects.id, projects.user_id, projects.files
       FROM project_preview_tokens
       JOIN projects
         ON projects.user_id = project_preview_tokens.user_id
        AND projects.id = project_preview_tokens.project_id
       WHERE project_preview_tokens.token_hash = ?
         AND project_preview_tokens.project_id = ?
         AND project_preview_tokens.expires_at > ?`
    )
    .bind(tokenHash, projectId, new Date().toISOString())
    .first<StoredProject>();
}

function sanitizeCookies(response: Response, request: Request): Response {
  if (response.status === 101 || request.headers.get("upgrade")?.toLowerCase() === "websocket") {
    return response;
  }

  const headers = new Headers(response.headers);
  const cookies = headers.getSetCookie();
  headers.delete("set-cookie");
  for (const cookie of cookies) {
    const name = cookie.slice(0, cookie.indexOf("=")).trim().toLowerCase();
    if (name === PREVIEW_COOKIE.toLowerCase() || name === "hamshake_session") continue;
    headers.append("set-cookie", cookie.replace(/;\s*domain=[^;]*/gi, ""));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export class NpmRegistry extends WorkerEntrypoint<PreviewEnvironment> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "registry.npmjs.org" ||
      !["GET", "HEAD"].includes(request.method) ||
      url.href.length > 2048
    ) {
      return new Response("Outbound request denied.", { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.delete("authorization");
    headers.delete("cookie");
    headers.delete("host");
    return fetch(new Request(url, { method: request.method, headers }), { redirect: "manual" });
  }
}

export class DenyOutbound extends WorkerEntrypoint<PreviewEnvironment> {
  fetch(): Response {
    return new Response("Outbound access is disabled for this preview.", { status: 403 });
  }
}

const WRITE_FILES_SCRIPT = `
const fs = require("node:fs/promises");
const path = require("node:path");
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => input += chunk);
process.stdin.on("end", async () => {
  try {
    const { files, previousPaths } = JSON.parse(input);
    const root = "/workspace";
    const currentPaths = new Set(files.map((file) => file.path));
    for (const oldPath of previousPaths) {
      if (currentPaths.has(oldPath)) continue;
      const target = path.resolve(root, oldPath);
      if (!target.startsWith(root + path.sep)) throw new Error("Invalid previous project path");
      try {
        await fs.unlink(target);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      let directory = path.dirname(target);
      while (directory !== root) {
        try {
          await fs.rmdir(directory);
          directory = path.dirname(directory);
        } catch (error) {
          if (error.code === "ENOENT") {
            directory = path.dirname(directory);
            continue;
          }
          if (error.code === "ENOTEMPTY" || error.code === "EEXIST") break;
          throw error;
        }
      }
    }
    for (const file of files) {
      const target = path.resolve(root, file.path);
      if (!target.startsWith(root + path.sep)) throw new Error("Invalid project path");
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, "utf8");
    }
    const packageFile = files.find((file) => file.path === "package.json");
    const source = JSON.parse(packageFile.content);
    const dependencies = { ...(source.dependencies || {}), ...(source.devDependencies || {}) };
    await fs.writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ name: "hamshake-preview", private: true, dependencies }, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Could not write project files");
    process.exitCode = 1;
  }
});
`;

function streamFromString(value: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(value));
      controller.close();
    }
  });
}

function formatCommandFailure(result: { stdout: ArrayBuffer; stderr: ArrayBuffer; exitCode: number }): string {
  const output = `${decoder.decode(result.stderr)}\n${decoder.decode(result.stdout)}`.trim();
  return output.slice(-1500) || `Command exited with status ${result.exitCode}.`;
}

export class PreviewContainer extends DurableObject<PreviewEnvironment> {
  private syncQueue: Promise<void> = Promise.resolve();

  async syncProject(version: string, files: ProjectFile[]): Promise<void> {
    const operation = this.syncQueue.then(() => this.applyProject(version, files));
    this.syncQueue = operation.catch(() => undefined);
    await operation;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const publicHost = url.host;
    url.protocol = "http:";
    url.host = "container";
    const forwarded = new Request(url, request);
    forwarded.headers.set("host", publicHost);
    forwarded.headers.set("x-forwarded-host", publicHost);
    forwarded.headers.set("x-forwarded-proto", "https");
    return this.ctx.container!.getTcpPort(3000).fetch(forwarded);
  }

  private async applyProject(version: string, files: ProjectFile[]): Promise<void> {
    const container = this.ctx.container!;
    const currentVersion = await this.ctx.storage.get<string>("version");
    const packageFile = files.find((file) => file.path === "package.json");
    if (!packageFile) throw new Error("The project is missing package.json.");
    const dependencies = validatePackageJson(packageFile.content);
    const packageVersion = await sha256(JSON.stringify(dependencies));
    const currentPackageVersion = await this.ctx.storage.get<string>("packageVersion");
    const isNewContainer = !container.running;
    if (!isNewContainer && currentVersion === version) {
      await container.setInactivityTimeout(5 * 60 * 1000);
      return;
    }

    const needsInstall = isNewContainer || currentPackageVersion !== packageVersion;
    if (needsInstall) {
      await container.interceptOutboundHttps("registry.npmjs.org", this.ctx.exports.NpmRegistry);
    }
    if (isNewContainer) {
      container.start({
        image: container.images.base,
        instance: "standard-1",
        enableInternet: false
      });
    } else {
      const serverPid = await this.ctx.storage.get<number>("serverPid");
      if (typeof serverPid === "number" && Number.isInteger(serverPid) && serverPid > 0) {
        const stopServer = await container.exec(
            [
              "node",
              "-e",
              "try { process.kill(Number(process.argv.at(-1)), 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }",
              String(serverPid)
            ],
          { cwd: "/workspace" }
        );
        await stopServer.output();
      }
    }
    await container.setInactivityTimeout(5 * 60 * 1000);

    try {
      const safeFiles = files.map((file) =>
        file.path === "package.json"
          ? {
              ...file,
              content: JSON.stringify(
                { name: "hamshake-preview", private: true, dependencies },
                null,
                2
              )
            }
          : file
      );
      const previousPaths = isNewContainer
        ? []
        : await this.ctx.storage.get<string[]>("paths") ?? [];
      const writeFiles = await container.exec(["node", "-e", WRITE_FILES_SCRIPT], {
        cwd: "/workspace",
        stdin: streamFromString(JSON.stringify({ files: safeFiles, previousPaths }))
      });
      const writeResult = await writeFiles.output();
      if (writeResult.exitCode !== 0) {
        throw new Error(`Could not prepare project files: ${formatCommandFailure(writeResult)}`);
      }

      if (needsInstall) {
        const install = await container.exec(
          [
            "npm",
            "install",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
            "--no-progress",
            "--package-lock=false",
            "--registry=https://registry.npmjs.org"
          ],
          {
            cwd: "/workspace",
            env: {
              HOME: "/tmp",
              NODE_EXTRA_CA_CERTS: "/etc/cloudflare/certs/cloudflare-containers-ca.crt"
            }
          }
        );
        const installResult = await install.output();
        if (installResult.exitCode !== 0) {
          throw new Error(`Could not install preview dependencies: ${formatCommandFailure(installResult)}`);
        }
      }
    } finally {
      if (needsInstall) {
        await container.interceptOutboundHttps("registry.npmjs.org", this.ctx.exports.DenyOutbound);
      }
    }

    const server = await container.exec(
      [
        "node",
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "0.0.0.0",
        "--port",
        "3000"
      ],
      {
        cwd: "/workspace",
        env: {
          HOME: "/tmp",
          NEXT_TELEMETRY_DISABLED: "1",
          NODE_ENV: "development"
        },
        stdout: "ignore"
      }
    );
    void server.exitCode.then(
    (exitCode) => {
      if (exitCode !== 0) console.error(`Next.js preview process exited with status ${exitCode}.`);
    },
    (error: unknown) => console.error("Could not monitor the Next.js preview process:", error)
    );

    await this.waitForServer(container);
    await this.ctx.storage.put("version", version);
    await this.ctx.storage.put("packageVersion", packageVersion);
    await this.ctx.storage.put("paths", files.map((file) => file.path));
    await this.ctx.storage.put("serverPid", server.pid);
  }

  private async waitForServer(container: NonNullable<typeof this.ctx.container>): Promise<void> {
    const port = container.getTcpPort(3000);
    let lastError: unknown;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await port.fetch("http://container/", {
          signal: AbortSignal.timeout(1000)
        });
        await response.body?.cancel();
        return;
      } catch (error) {
        lastError = error;
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error("The Next.js preview server did not start.", { cause: lastError });
  }
}

export default {
  async fetch(request: Request, env: PreviewEnvironment): Promise<Response> {
    const url = new URL(request.url);
    const hostMatch = PREVIEW_HOST_PATTERN.exec(url.hostname);
    if (!hostMatch) return textResponse("Unknown preview host.", 404);
    const projectId = hostMatch[1].toLowerCase();

    try {
      if (url.pathname === PREVIEW_AUTH_PATH) {
        if (request.method !== "POST" || request.headers.get("origin") !== url.origin) {
          return textResponse("Invalid preview authorization request.", 403);
        }
        const token = await readPreviewToken(request);
        if (!token || !(await loadProject(env, projectId, token))) {
          return textResponse("This preview link is invalid or has expired.", 403);
        }
        return new Response(null, {
          status: 204,
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
            "Set-Cookie": `${PREVIEW_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`
          }
        });
      }

      const token = getCookie(request, PREVIEW_COOKIE);
      if (!token) {
        if (url.pathname === "/" && request.method === "GET") return bootstrapResponse();
        return textResponse("Open this preview from your Hamshake project.", 401);
      }
      const project = await loadProject(env, projectId, token);
      if (!project) {
        if (url.pathname === "/" && request.method === "GET") return bootstrapResponse();
        return textResponse("This preview link has expired. Refresh the preview from Hamshake.", 401);
      }

      const files = validateFiles(project.files);
      const version = await sha256(JSON.stringify(files));
      const containerName = await sha256(`${project.user_id}\0${project.id}`);
      const container = env.PREVIEW_CONTAINERS.getByName(containerName);
      await container.syncProject(version, files);

      const headers = new Headers(request.headers);
      removeControlCookies(headers);
      const forwarded = new Request(request, { headers });
      const response = await container.fetch(forwarded);
      return sanitizeCookies(response, request);
    } catch (error) {
      console.error("Cloudflare Container preview request failed:", error);
      const message = error instanceof Error ? error.message : "Preview startup failed.";
      return textResponse(`Could not start this full-stack preview. ${message}`, 502);
    }
  }
};
