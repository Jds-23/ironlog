import { publicProcedure, router } from "../index";
import { workoutRouter } from "./workout";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: publicProcedure.query(() => {
    return {
      message: "This is private",
    };
  }),
  workout: workoutRouter,
});
export type AppRouter = typeof appRouter;
