import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { courseMaterials, quizAttempts, quizzes } from "../db/schema/index.js";
import { isUserEnrolled } from "../services/class-enrollment.service.js";
import {
	createEmbeddingProviderFromEnv,
	hasEmbeddingConfig,
} from "../services/ingestion/embedding-factory.js";
import { createChunkContextRetriever } from "../services/quiz/chunk-context-retriever.js";
import { createClassroomMetadataContextRetriever } from "../services/quiz/context-retriever.js";
import { createQuizGeneratorFromEnv } from "../services/quiz/generator-factory.js";
import {
	findLatestClassQuiz,
	scoreAttempt,
} from "../services/quiz/generation.service.js";
import { drawQuiz } from "../services/quiz/question-bank.service.js";
import {
	InsufficientContextError,
	type StoredQuizQuestion,
} from "../services/quiz/ports.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/index.js";

/** O quiz é de revisão: o gabarito e a explicação vão junto, e o app decide quando mostrá-los. */
function toPublicQuestion(question: StoredQuizQuestion) {
	return {
		id: question.id,
		topic: question.topic,
		text: question.text,
		explanation: question.explanation,
		options: question.options.map((option) => ({
			id: option.id,
			text: option.text,
			correct: option.correct,
		})),
	};
}

export const quizRouter = router({
	getByClass: publicProcedure
		.input(z.object({ classSessionId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const quiz = await findLatestClassQuiz(ctx.db, input.classSessionId);
			if (!quiz) return null;
			return {
				...quiz,
				questionsJson: (quiz.questionsJson as StoredQuizQuestion[]).map(
					toPublicQuestion,
				),
			};
		}),

	getById: protectedProcedure
		.input(z.object({ quizId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [quiz] = await ctx.db
				.select()
				.from(quizzes)
				.where(eq(quizzes.id, input.quizId));
			if (!quiz) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Quiz não encontrado",
				});
			}
			return {
				...quiz,
				questionsJson: (quiz.questionsJson as StoredQuizQuestion[]).map(
					toPublicQuestion,
				),
			};
		}),

	/**
	 * Sorteia um quiz do banco de perguntas da aula inteira ou de um único documento
	 * (`materialId`), sem repetir o que o aluno já respondeu.
	 */
	requestGeneration: protectedProcedure
		.input(
			z.object({
				classSessionId: z.string().uuid(),
				materialId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!(await isUserEnrolled(ctx.db, ctx.user.id, input.classSessionId))) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Class session not found",
				});
			}

			let scopeLabel = "Todos os materiais";
			if (input.materialId) {
				const [material] = await ctx.db
					.select()
					.from(courseMaterials)
					.where(eq(courseMaterials.id, input.materialId));
				if (!material || material.classSessionId !== input.classSessionId) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Documento não encontrado nesta aula.",
					});
				}
				if (!hasEmbeddingConfig()) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: "Quiz de um único documento exige a leitura dos PDFs.",
					});
				}
				scopeLabel = material.title;
			}

			try {
				const quiz = await drawQuiz(
					ctx.db,
					{
						contextRetriever: hasEmbeddingConfig()
							? createChunkContextRetriever(ctx.db, createEmbeddingProviderFromEnv())
							: createClassroomMetadataContextRetriever(ctx.db),
						quizGenerator: createQuizGeneratorFromEnv(),
					},
					{
						userId: ctx.user.id,
						classSessionId: input.classSessionId,
						materialId: input.materialId ?? null,
						scopeLabel,
					},
				);
				return { quizId: quiz.id };
			} catch (cause) {
				if (cause instanceof InsufficientContextError) {
					throw new TRPCError({
						code: "PRECONDITION_FAILED",
						message: cause.message,
					});
				}
				ctx.req.log?.error({ err: cause }, "Falha ao gerar o quiz");
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Não foi possível gerar o quiz. Tente novamente.",
					cause,
				});
			}
		}),

	submitAttempt: protectedProcedure
		.input(
			z.object({
				quizId: z.string().uuid(),
				answers: z.array(
					z.object({
						questionId: z.string(),
						optionId: z.string(),
					}),
				),
				timeSpentSeconds: z.number().int().nonnegative(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [quiz] = await ctx.db
				.select()
				.from(quizzes)
				.where(eq(quizzes.id, input.quizId));
			if (!quiz) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Quiz não encontrado",
				});
			}

			const questions = quiz.questionsJson as StoredQuizQuestion[];
			const { score, correct, total, results } = scoreAttempt(
				questions,
				input.answers,
			);

			const [attempt] = await ctx.db
				.insert(quizAttempts)
				.values({
					quizId: input.quizId,
					userId: ctx.user.id,
					score: String(score),
					answersJson: input.answers,
					timeSpentSeconds: input.timeSpentSeconds,
				})
				.returning();

			if (!attempt) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Falha ao salvar a tentativa",
				});
			}

			return { attemptId: attempt.id, score, correct, total, results };
		}),
});
