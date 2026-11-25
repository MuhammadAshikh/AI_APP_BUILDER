import { NextResponse } from "next/server";
import {
  clearAuthRateLimit,
  clearSession,
  clearSessionCookie,
  consumeAuthRateLimit,
  createSession,
  createSessionRecord,
  derivePasswordHash,
  getAuthenticatedUser,
  isSameOrigin,
  setSessionCookie,
  verifyPassword
} from "@/lib/auth";
import { getD1Database } from "@/lib/d1";

type AccountRow = {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "local";
}

function invalidCredentials() {
  return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not read the D1 account session:", error);
    return NextResponse.json({ error: "Could not check your sign-in session." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Hamshake." }, { status: 403 });
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
    !("action" in body) ||
    (body.action !== "signin" && body.action !== "signup") ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("password" in body) ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "Provide an email, password, and valid authentication action." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length > 128 ||
    new TextEncoder().encode(password).byteLength > 1024
  ) {
    return NextResponse.json({ error: "Enter a valid email address and password." }, { status: 400 });
  }

  const isSignup = body.action === "signup";
  if (!password) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  try {
    const ip = getClientIp(request);
    const rateKey = isSignup ? `signup:${ip}` : `signin:${email}:${ip}`;
    const allowed = await consumeAuthRateLimit(
      rateKey,
      isSignup ? 5 : 10,
      isSignup ? 60 * 60 * 1000 : 15 * 60 * 1000
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Wait a while before trying again." },
        { status: 429 }
      );
    }

    const db = await getD1Database();
    if (isSignup) {
      const passwordHash = await derivePasswordHash(password);
      const userId = crypto.randomUUID();
      const session = await createSessionRecord();
      await db.batch([
        db.prepare(
          "INSERT INTO users (id, email, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?, ?)"
        ).bind(userId, email, passwordHash.hash, passwordHash.salt, passwordHash.iterations),
        db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
          .bind(session.tokenHash, userId, session.expiresAt)
      ]);
      return NextResponse.json(
        { user: { id: userId, email } },
        { headers: { "Set-Cookie": setSessionCookie(request, session.token), "Cache-Control": "no-store" } }
      );
    }

    const account = await db
      .prepare("SELECT id, email, password_hash, password_salt, password_iterations FROM users WHERE email = ?")
      .bind(email)
      .first<AccountRow>();
    const passwordMatches = await verifyPassword(password, account);
    if (!passwordMatches || !account) return invalidCredentials();

    await clearAuthRateLimit(rateKey);
    const cookie = setSessionCookie(request, await createSession(account.id));
    return NextResponse.json(
      { user: { id: account.id, email: account.email } },
      { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isSignup && message.includes("UNIQUE constraint failed: users.email")) {
      return NextResponse.json({ error: "An account already uses that email." }, { status: 409 });
    }
    console.error("Could not authenticate with D1:", error);
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "This request must come from Hamshake." }, { status: 403 });
  }

  try {
    await clearSession(request);
    return new NextResponse(null, {
      status: 204,
      headers: { "Set-Cookie": clearSessionCookie(request), "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Could not end the D1 account session:", error);
    return NextResponse.json({ error: "Could not sign out. Please try again." }, { status: 503 });
  }
}
