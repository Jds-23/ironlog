import { auth } from "@ironlog/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext(opts: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: opts.context.req.raw.headers,
  });
  return {
    userId: session?.user?.id,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
