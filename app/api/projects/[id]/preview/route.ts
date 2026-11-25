import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSameOrigin, type AccountUser } from "@/lib/auth";
import { getD1Database } from "@/lib/d1";

type PreviewProject = {
  id: string;
  files: string;
};

const PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREVIEW_TTL_SECONDS = 60 * 60 * 24;
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashToken(token: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(token))));
}

function newToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

function hasPreviewFiles(serializedFiles: string): boolean {
  try {
    const files: unknown = JSON.parse(serializedFiles);
    return Array.isArray(files) &&
      files.some((file) =>
        typeof file === "object" &&
        file !== null &&
        typeof file.path === "string" &&
        file.path === "package.json"
      );
  } catch {
    return false;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Hamshake." }, { status: 403 });
  }

  let user: AccountUser | null = null;
  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    console.error("Could not verify the preview account session:", error);
    return NextResponse.json({ error: "Could not verify your sign-in session." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "Sign in is required to preview a project." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!PROJECT_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: "This project cannot be previewed." }, { status: 400 });
  }

  try {
    const db = await getD1Database();
    const project = await db
      .prepare("SELECT id, files FROM projects WHERE user_id = ? AND id = ?")
      .bind(user.id, id)
      .first<PreviewProject>();

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (!hasPreviewFiles(project.files)) {
      return NextResponse.json({ error: "Generate a Next.js project before opening its full-stack preview." }, { status: 409 });
    }

    const token = newToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PREVIEW_TTL_SECONDS * 1000).toISOString();
    await db.batch([
      db.prepare("DELETE FROM project_preview_tokens WHERE expires_at <= ?").bind(now.toISOString()),
      db.prepare(
        "INSERT INTO project_preview_tokens (token_hash, user_id, project_id, expires_at) VALUES (?, ?, ?, ?)"
      ).bind(await hashToken(token), user.id, project.id, expiresAt)
    ]);

    return NextResponse.json(
      { previewUrl: `https://p-${project.id}.hamshake.com/#${token}` },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Could not create a Cloudflare Container preview:", error);
    return NextResponse.json(
      { error: "Could not create the preview. Check the preview Worker and D1 migration." },
      { status: 503 }
    );
  }
}
