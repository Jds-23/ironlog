import { protectedProcedure, publicProcedure, router } from "../index";
import { sessionRouter } from "./session";
import { workoutRouter } from "./workout";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(() => {
    return {
      message: "This is private",
    };
  }),
  workout: workoutRouter,
  session: sessionRouter,
});
export type AppRouter = typeof appRouter;
