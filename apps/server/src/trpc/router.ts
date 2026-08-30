import { healthRouter } from "../routers/health.js";
import { router } from "./index.js";

export const appRouter = router({
	health: healthRouter,
});

export type AppRouter = typeof appRouter;
