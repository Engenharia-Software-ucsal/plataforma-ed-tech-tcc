import { desc, eq } from "drizzle-orm";
import { quizzes } from "../../db/schema/index.js";
import type { StoredQuizQuestion } from "./ports.js";

/** Quiz mais recente da aula; só a rota legada `quiz.getByClass` ainda usa. */
export async function findLatestClassQuiz(
	db: any,
	classSessionId: string,
): Promise<typeof quizzes.$inferSelect | null> {
	const [quiz] = await db
		.select()
		.from(quizzes)
		.where(eq(quizzes.classSessionId, classSessionId))
		.orderBy(desc(quizzes.createdAt))
		.limit(1);
	return quiz ?? null;
}

export type ScoredAttemptResult = {
	score: number;
	correct: number;
	total: number;
	results: Array<{ questionId: string; correct: boolean; explanation: string }>;
};

export function scoreAttempt(
	questions: StoredQuizQuestion[],
	answers: Array<{ questionId: string; optionId: string }>,
): ScoredAttemptResult {
	const answerByQuestion = new Map(
		answers.map((a) => [a.questionId, a.optionId]),
	);

	let correct = 0;
	const results = questions.map((question) => {
		const chosenOptionId = answerByQuestion.get(question.id);
		const chosenOption = question.options.find((o) => o.id === chosenOptionId);
		const isCorrect = chosenOption?.correct ?? false;
		if (isCorrect) correct += 1;
		return {
			questionId: question.id,
			correct: isCorrect,
			explanation: question.explanation,
		};
	});

	const total = questions.length;
	const score = total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;

	return { score, correct, total, results };
}
