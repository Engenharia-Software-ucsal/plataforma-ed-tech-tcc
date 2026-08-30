import { busRouter } from "../routers/bus.js";
import { classRouter } from "../routers/class.js";
import { healthRouter } from "../routers/health.js";
import { router } from "./index.js";

export const appRouter = router({
	health: healthRouter,
	bus: busRouter,
	class: classRouter,
});

export type AppRouter = typeof appRouter;
