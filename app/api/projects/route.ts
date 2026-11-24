import { NextResponse } from "next/server";
import { getAuthenticatedUser, isSameOrigin, type AccountUser } from "@/lib/auth";
import { getD1Database } from "@/lib/d1";

type ProjectMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
};

type ProjectFile = {
  path: string;
  content: string;
};

type ProjectInput = {
  id: string;
  title: string;
  updated_at: string;
  messages: ProjectMessage[];
  html: string | null;
  files: ProjectFile[];
  is_new_project: boolean;
};

type ProjectRow = Omit<ProjectInput, "messages" | "files" | "is_new_project"> & {
  messages: string;
  files: string;
  is_new_project: number;
};

const upsertProjectSql = `
  INSERT INTO projects (user_id, id, title, updated_at, messages, html, files, is_new_project)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (user_id, id) DO UPDATE SET
    title = excluded.title,
    updated_at = excluded.updated_at,
    messages = excluded.messages,
    html = excluded.html,
    files = excluded.files,
    is_new_project = excluded.is_new_project
  WHERE excluded.updated_at >= projects.updated_at
`;

function isProjectMessage(value: unknown): value is ProjectMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.time === "string"
  );
}

function isProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as Record<string, unknown>;
  return typeof file.path === "string" && typeof file.content === "string";
}

function isProjectInput(value: unknown): value is ProjectInput {
  if (typeof value !== "object" || value === null) return false;
  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    project.id.length > 0 &&
    project.id.length <= 200 &&
    typeof project.title === "string" &&
    project.title.trim().length > 0 &&
    project.title.length <= 500 &&
    typeof project.updated_at === "string" &&
    Number.isFinite(Date.parse(project.updated_at)) &&
    Array.isArray(project.messages) &&
    project.messages.every(isProjectMessage) &&
    (typeof project.html === "string" || project.html === null) &&
    Array.isArray(project.files) &&
    project.files.every(isProjectFile) &&
    typeof project.is_new_project === "boolean" &&
    JSON.stringify(project).length <= 500_000
  );
}

function makeProjectStatement(
  db: HamshakeD1Database,
  userId: string,
  project: ProjectInput
): HamshakeD1Statement {
  return db.prepare(upsertProjectSql).bind(
    userId,
    project.id,
    project.title,
    new Date(project.updated_at).toISOString(),
    JSON.stringify(project.messages),
    project.html,
    JSON.stringify(project.files),
    project.is_new_project ? 1 : 0
  );
}

export async function GET(request: Request) {
  let user: AccountUser | null = null;
  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    console.error("Could not verify the D1 account session:", error);
    return NextResponse.json({ error: "Could not verify your sign-in session." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "Sign in is required to load projects." }, { status: 401 });
  }

  try {
    const db = await getD1Database();
    const { results } = await db
      .prepare(
        "SELECT id, title, updated_at, messages, html, files, is_new_project FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
      )
      .bind(user.id)
      .all<ProjectRow>();

    return NextResponse.json(
      {
        projects: results.map((project) => ({
          ...project,
          messages: JSON.parse(project.messages),
          files: JSON.parse(project.files),
          is_new_project: Boolean(project.is_new_project)
        }))
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Could not load Cloudflare D1 projects:", error);
    return NextResponse.json(
      { error: "Could not load projects from Cloudflare D1. Check the database binding and migrations." },
      { status: 503 }
    );
  }
}

export async function PUT(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Hamshake." }, { status: 403 });
  }
  let user: AccountUser | null = null;
  try {
    user = await getAuthenticatedUser(request);
  } catch (error) {
    console.error("Could not verify the D1 account session:", error);
    return NextResponse.json({ error: "Could not verify your sign-in session." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "Sign in is required to save projects." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("projects" in body) ||
    !Array.isArray(body.projects) ||
    body.projects.length > 100 ||
    !body.projects.every(isProjectInput)
  ) {
    return NextResponse.json({ error: "The request must contain up to 100 valid projects." }, { status: 400 });
  }

  try {
    const db = await getD1Database();
    const statements = body.projects.map((project) => makeProjectStatement(db, user.id, project));
    for (let index = 0; index < statements.length; index += 50) {
      await db.batch(statements.slice(index, index + 50));
    }
    return NextResponse.json({ saved: statements.length });
  } catch (error) {
    console.error("Could not save Cloudflare D1 projects:", error);
    return NextResponse.json(
      { error: "Could not save projects to Cloudflare D1. Check the database binding and migrations." },
      { status: 503 }
    );
  }
}
