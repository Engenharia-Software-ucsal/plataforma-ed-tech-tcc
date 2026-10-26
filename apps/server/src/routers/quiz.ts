import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { quizAttempts, quizzes } from "../db/schema/index.js";
import { publicProcedure, router } from "../trpc/index.js";

export const quizRouter = router({
	getByClass: publicProcedure
		.input(
			z.object({
				classSessionId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const [quiz] = await ctx.db
				.select()
				.from(quizzes)
				.where(eq(quizzes.classSessionId, input.classSessionId));
			return quiz ?? null;
		}),

	submitAttempt: publicProcedure
		.input(
			z.object({
				quizId: z.string().uuid(),
				score: z.number().min(0).max(100),
				answersJson: z.any(),
				timeSpentSeconds: z.number().int().nonnegative(),
				userId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.user?.id ?? input.userId;
			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Usuário não autenticado",
				});
			}

			const [attempt] = await ctx.db
				.insert(quizAttempts)
				.values({
					quizId: input.quizId,
					userId,
					score: String(input.score),
					answersJson: input.answersJson,
					timeSpentSeconds: input.timeSpentSeconds,
				})
				.returning();

			return attempt;
		}),
});
