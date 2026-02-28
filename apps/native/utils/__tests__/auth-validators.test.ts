import { signInSchema, signUpSchema } from "../auth-validators";

describe("signInSchema", () => {
  it("accepts valid email and password", () => {
    const result = signInSchema.safeParse({ email: "test@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = signInSchema.safeParse({ email: "", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signInSchema.safeParse({ email: "test@example.com", password: "short" });
    expect(result.success).toBe(false);
  });

  it("trims email whitespace", () => {
    const result = signInSchema.safeParse({
      email: "  test@example.com  ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });
});

describe("signUpSchema", () => {
  it("accepts valid name, email, and password", () => {
    const result = signUpSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = signUpSchema.safeParse({
      name: "A",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = signUpSchema.safeParse({
      name: "Test User",
      email: "bad-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("trims name whitespace", () => {
    const result = signUpSchema.safeParse({
      name: "  Test User  ",
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test User");
    }
  });
});
