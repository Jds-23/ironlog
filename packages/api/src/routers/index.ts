import { publicProcedure, router } from "../index";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: publicProcedure.query(() => {
    return {
      message: "This is private",
    };
  }),
});
export type AppRouter = typeof appRouter;
