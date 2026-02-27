import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(_opts: CreateContextOptions) {
  return {};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
