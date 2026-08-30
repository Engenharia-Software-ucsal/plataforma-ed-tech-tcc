import { publicProcedure, router } from "../trpc/index.js";

export const healthRouter = router({
	check: publicProcedure.query(() => {
		return { status: "healthy", timestamp: new Date().toISOString() };
	}),
});
