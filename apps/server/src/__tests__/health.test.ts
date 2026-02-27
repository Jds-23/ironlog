import { describe, it, expect } from "vitest";
import app from "../index";

describe("health check", () => {
  it("GET / returns OK", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
  });
});
