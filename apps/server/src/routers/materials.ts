import { eq } from "drizzle-orm";
import { z } from "zod";
import { courseMaterials } from "../db/schema/index.js";
import { publicProcedure, router } from "../trpc/index.js";

export const materialsRouter = router({
	listByClass: publicProcedure
		.input(
			z.object({
				classSessionId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return ctx.db
				.select()
				.from(courseMaterials)
				.where(eq(courseMaterials.classSessionId, input.classSessionId));
		}),
});
