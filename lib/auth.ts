import { getD1Database } from "@/lib/d1";

export type AccountUser = {
  id: string;
  email: string;
};

type StoredSession = AccountUser & {
  expires_at: string;
};

const SESSION_COOKIE = "hamshake_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 310_000;
const DUMMY_SALT = "7f80d0b302660f1aa8131fc4cdd31ac2";
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function hashPassword(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const result = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256
  );
  return toHex(new Uint8Array(result));
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)hamshake_session=([a-f0-9]{64})(?:;|$)/i)?.[1];
  return token ?? null;
}

function sessionCookie(request: Request, token: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function getAuthenticatedUser(request: Request): Promise<AccountUser | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const db = await getD1Database();
  const session = await db
    .prepare(
      "SELECT users.id, users.email, sessions.expires_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ?"
    )
    .bind(await sha256(token))
    .first<StoredSession>();

  if (!session) return null;
  if (Date.parse(session.expires_at) <= Date.now()) {
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token))
    ]);
    return null;
  }

  return { id: session.id, email: session.email };
}

export async function createSessionRecord() {
  const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  return { token, tokenHash: await sha256(token), expiresAt };
}

export async function createSession(userId: string): Promise<string> {
  const db = await getD1Database();
  const session = await createSessionRecord();
  await db.batch([
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(session.tokenHash, userId, session.expiresAt)
  ]);
  return session.token;
}

export async function clearSession(request: Request): Promise<void> {
  const token = getSessionToken(request);
  if (!token) return;
  const db = await getD1Database();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token))
  ]);
}

export function setSessionCookie(request: Request, token: string): string {
  return sessionCookie(request, token, SESSION_TTL_SECONDS);
}

export function clearSessionCookie(request: Request): string {
  return sessionCookie(request, "", 0);
}

export async function consumeAuthRateLimit(
  key: string,
  limit: number,
  windowMilliseconds: number
): Promise<boolean> {
  const db = await getD1Database();
  const keyHash = await sha256(key);
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - windowMilliseconds).toISOString();
  const result = await db
    .prepare(
      `INSERT INTO auth_rate_limits (key_hash, window_started_at, attempts)
       VALUES (?, ?, 1)
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE WHEN auth_rate_limits.window_started_at <= ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
         window_started_at = CASE WHEN auth_rate_limits.window_started_at <= ? THEN excluded.window_started_at ELSE auth_rate_limits.window_started_at END
       RETURNING attempts`
    )
    .bind(keyHash, now, cutoff, cutoff)
    .first<{ attempts: number }>();
  return (result?.attempts ?? limit + 1) <= limit;
}

export async function clearAuthRateLimit(key: string): Promise<void> {
  const db = await getD1Database();
  await db.batch([
    db.prepare("DELETE FROM auth_rate_limits WHERE key_hash = ?").bind(await sha256(key))
  ]);
}

export async function derivePasswordHash(
  password: string,
  salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
): Promise<{ hash: string; salt: string; iterations: number }> {
  return {
    hash: await hashPassword(password, salt, PASSWORD_ITERATIONS),
    salt,
    iterations: PASSWORD_ITERATIONS
  };
}

export async function verifyPassword(
  password: string,
  account: { password_salt: string; password_hash: string; password_iterations: number } | null
): Promise<boolean> {
  const iterations = account?.password_iterations ?? PASSWORD_ITERATIONS;
  const validIterations = Number.isInteger(iterations) && iterations >= 100_000 && iterations <= 1_000_000;
  const salt = account && validIterations ? account.password_salt : DUMMY_SALT;
  const hash = await hashPassword(password, salt, validIterations ? iterations : PASSWORD_ITERATIONS);
  return Boolean(account && validIterations) &&
    constantTimeEqual(hash, account?.password_hash ?? "0".repeat(64));
}
