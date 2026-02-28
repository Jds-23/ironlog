import { env } from "cloudflare:workers";
import app from "../../index";

export async function createAuthTables() {
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, email_verified INTEGER NOT NULL DEFAULT 0, image TEXT, created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)), updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)));",
  );
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS session (id TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)), updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)), ip_address TEXT, user_agent TEXT, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE);",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id);");
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS account (id TEXT PRIMARY KEY, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, access_token TEXT, refresh_token TEXT, id_token TEXT, access_token_expires_at INTEGER, refresh_token_expires_at INTEGER, scope TEXT, password TEXT, created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)), updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)));",
  );
  await env.DB.exec("CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id);");
  await env.DB.exec(
    "CREATE TABLE IF NOT EXISTS verification (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)), updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsec') * 1000 as integer)));",
  );
  await env.DB.exec(
    "CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);",
  );
}

interface SignUpOverrides {
  name?: string;
  email?: string;
  password?: string;
}

// biome-ignore lint: test helper
export async function signUpTestUser(
  overrides?: SignUpOverrides,
): Promise<{ res: Response; json: any }> {
  const body = {
    name: overrides?.name ?? "Test User",
    email: overrides?.email ?? "test@example.com",
    password: overrides?.password ?? "password123",
  };
  const res = await app.request("/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { res, json };
}

export async function signInTestUser(email: string, password: string) {
  const res = await app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res;
}

// biome-ignore lint: test helper
export async function getSession(cookie: string): Promise<{ res: Response; json: any }> {
  const res = await app.request("/api/auth/get-session", {
    headers: { Cookie: cookie },
  });
  const json = await res.json();
  return { res, json };
}

export async function signOut(cookie: string) {
  const res = await app.request("/api/auth/sign-out", {
    method: "POST",
    headers: {
      Cookie: cookie,
      Origin: "http://localhost:8081",
    },
  });
  return res;
}

export function getSessionCookie(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  // Extract all cookie key=value pairs from set-cookie headers
  // Better Auth may set multiple cookies; we need them all
  const cookies: string[] = [];
  for (const part of setCookie.split(",")) {
    const match = part.trim().match(/^([^=]+=[^;]+)/);
    if (match?.[1]) {
      cookies.push(match[1]);
    }
  }
  return cookies.length > 0 ? cookies.join("; ") : null;
}
