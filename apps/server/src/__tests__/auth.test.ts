import { env } from "cloudflare:workers";
import { describe, it, expect, beforeAll } from "vitest";
import {
  createAuthTables,
  signUpTestUser,
  signInTestUser,
  getSession,
  signOut,
  getSessionCookie,
} from "./helpers/setup-auth";

beforeAll(async () => {
  await createAuthTables();
});

describe("auth", () => {
  it("sign up creates user and session", async () => {
    const { res, json } = await signUpTestUser({
      name: "Alice",
      email: "alice@test.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(json.user).toBeDefined();
    expect(json.user.email).toBe("alice@test.com");
    expect(json.user.name).toBe("Alice");
    expect(json.token).toBeDefined();

    const cookie = getSessionCookie(res);
    expect(cookie).toBeTruthy();
    expect(cookie).toContain("better-auth.session_token");
  });

  it("sign in returns session cookie", async () => {
    await signUpTestUser({ email: "signin@test.com", password: "password123" });

    const res = await signInTestUser("signin@test.com", "password123");

    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.token).toBeDefined();

    const cookie = getSessionCookie(res);
    expect(cookie).toBeTruthy();
    expect(cookie).toContain("better-auth.session_token");
  });

  it("wrong password returns error", async () => {
    await signUpTestUser({ email: "wrongpw@test.com", password: "password123" });

    const res = await signInTestUser("wrongpw@test.com", "wrongpassword");

    expect(res.status).not.toBe(200);
  });

  it("get session returns user when authenticated", async () => {
    await signUpTestUser({ email: "getsess@test.com", password: "password123" });
    const signInRes = await signInTestUser("getsess@test.com", "password123");
    const cookie = getSessionCookie(signInRes)!;

    const { json } = await getSession(cookie);

    expect(json.user).toBeDefined();
    expect(json.user.email).toBe("getsess@test.com");
    expect(json.session).toBeDefined();
  });

  it("get session returns null when unauthenticated", async () => {
    const { json } = await getSession("invalid=cookie");

    // Better Auth returns null body when no valid session exists
    expect(json).toBeNull();
  });

  it("sign out invalidates session", async () => {
    await signUpTestUser({ email: "signout@test.com", password: "password123" });
    const signInRes = await signInTestUser("signout@test.com", "password123");
    const cookie = getSessionCookie(signInRes)!;

    await signOut(cookie);

    // After sign-out, send only the session_token (not the cached session_data)
    // to force a DB lookup on the now-deleted session
    const tokenOnly = cookie
      .split("; ")
      .filter((c) => c.startsWith("better-auth.session_token"))
      .join("; ");
    const { json } = await getSession(tokenOnly);
    expect(json).toBeNull();
  });

  it("expired session returns null", async () => {
    await signUpTestUser({ email: "expired@test.com", password: "password123" });
    const signInRes = await signInTestUser("expired@test.com", "password123");
    const cookie = getSessionCookie(signInRes)!;

    // Verify session works before expiry
    const { json: before } = await getSession(cookie);
    expect(before.user.email).toBe("expired@test.com");

    // Expire the session in DB
    await env.DB.exec(
      "UPDATE session SET expires_at = 0 WHERE user_id = (SELECT id FROM user WHERE email = 'expired@test.com')",
    );

    // Use only session_token (skip cached session_data) to force DB lookup
    const tokenOnly = cookie
      .split("; ")
      .filter((c) => c.startsWith("better-auth.session_token"))
      .join("; ");
    const { json: after } = await getSession(tokenOnly);
    expect(after).toBeNull();
  });

  it("session persists across multiple requests", async () => {
    await signUpTestUser({ email: "persist@test.com", password: "password123" });
    const signInRes = await signInTestUser("persist@test.com", "password123");
    const cookie = getSessionCookie(signInRes)!;

    const { json: first } = await getSession(cookie);
    const { json: second } = await getSession(cookie);

    expect(first.user.email).toBe("persist@test.com");
    expect(second.user.email).toBe("persist@test.com");
    expect(first.session.token).toBe(second.session.token);
  });
});
