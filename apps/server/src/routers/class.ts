import { eq } from "drizzle-orm";
import { z } from "zod";
import { classSessions } from "../db/schema/index.js";
import { publicProcedure, router } from "../trpc/index.js";

export const classRouter = router({
	list: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(classSessions).orderBy(classSessions.startTime);
	}),

	byId: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [session] = await ctx.db
				.select()
				.from(classSessions)
				.where(eq(classSessions.id, input.id));
			if (!session) {
				throw new Error("Class session not found");
			}
			return session;
		}),

	create: publicProcedure
		.input(
			z.object({
				startTime: z.string(),
				endTime: z.string(),
				subject: z.string(),
				professor: z.string(),
				room: z.string(),
				difficultyLevel: z.enum(["facil", "medio", "dificil"]).default("medio"),
				difficultyScore: z.string().default("0.0"),
				difficultyReviewCount: z.number().int().nonnegative().default(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [created] = await ctx.db
				.insert(classSessions)
				.values(input)
				.returning();
			return created;
		}),
});
