import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function readTokenFromEnvFile(contents) {
  const line = contents
    .split(/\r?\n/)
    .find((entry) => /^\s*CLOUDFLARE_D1_API_TOKEN\s*=/.test(entry));
  if (!line) return null;

  const value = line.slice(line.indexOf("=") + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

async function getD1Token() {
  if (process.env.CLOUDFLARE_D1_API_TOKEN) return process.env.CLOUDFLARE_D1_API_TOKEN;

  for (const file of [".env.local", "app/.env.local"]) {
    try {
      const token = readTokenFromEnvFile(await readFile(resolve(file), "utf8"));
      if (token) return token;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  throw new Error("Set CLOUDFLARE_D1_API_TOKEN in .env.local or the environment.");
}

try {
  const token = await getD1Token();
  const wranglerPath = resolve("node_modules/wrangler/bin/wrangler.js");
  const child = spawn(
    process.execPath,
    [wranglerPath, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: { ...process.env, CLOUDFLARE_API_TOKEN: token }
    }
  );

  child.on("error", (error) => {
    console.error("Could not start Wrangler:", error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (signal) {
      console.error(`Wrangler was terminated by ${signal}.`);
      process.exitCode = 1;
    } else {
      process.exitCode = code ?? 1;
    }
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not read the D1 token.");
  process.exitCode = 1;
}
