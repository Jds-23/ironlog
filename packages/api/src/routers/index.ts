import { protectedProcedure, publicProcedure, router } from "../index";
import { metricsRouter } from "./metrics";
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
  metrics: metricsRouter,
});
export type AppRouter = typeof appRouter;
