import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
	courseMaterials,
	questionBanks,
	quizAttempts,
	quizzes,
} from "../../db/schema/index.js";
import { SAMPLE_GENERATOR_ID } from "./fake-generator.js";
import {
	BANK_MAX_QUESTIONS,
	BANK_MIN_QUESTIONS,
	BANK_MIN_QUESTIONS_MANY_DOCUMENTS,
	MANY_DOCUMENTS_THRESHOLD,
	type ContextRetriever,
	type QuizDifficulty,
	type QuizGenerator,
	type QuizQuestionDraft,
	QUIZ_QUESTION_COUNT,
	type StoredQuizQuestion,
} from "./ports.js";

const DIFFICULTY: QuizDifficulty = "medio";
const MAX_QUESTIONS_IN_BANK = 60;

export type BankScope = {
	classSessionId: string;
	/** Nulo = todos os materiais da aula. */
	materialId: string | null;
};

type Deps = { contextRetriever: ContextRetriever; quizGenerator: QuizGenerator };

function normalize(text: string): string {
	return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[result[i], result[j]] = [result[j] as T, result[i] as T];
	}
	return result;
}

function toStoredQuestions(drafts: QuizQuestionDraft[]): StoredQuizQuestion[] {
	return drafts.map((draft) => ({
		id: randomUUID(),
		topic: draft.topic,
		text: draft.text,
		explanation: draft.explanation,
		sourceExcerpt: draft.sourceExcerpt,
		options: draft.options.map((option) => ({
			id: randomUUID(),
			text: option.text,
			correct: option.correct,
		})),
	}));
}

/** Quantas perguntas pedir à IA conforme a quantidade de documentos lidos no escopo. */
export function questionRangeFor(documentCount: number) {
	return {
		minQuestions:
			documentCount > MANY_DOCUMENTS_THRESHOLD
				? BANK_MIN_QUESTIONS_MANY_DOCUMENTS
				: BANK_MIN_QUESTIONS,
		maxQuestions: BANK_MAX_QUESTIONS,
	};
}

async function generateQuestions(
	deps: Deps,
	classSessionId: string,
	documentCount: number,
	materialIds?: string[],
): Promise<StoredQuizQuestion[]> {
	const context = await deps.contextRetriever.getContext(classSessionId, {
		materialIds,
	});
	const drafts = await deps.quizGenerator.generate({
		context,
		...questionRangeFor(documentCount),
		difficulty: DIFFICULTY,
	});
	return toStoredQuestions(drafts);
}

async function findBank(
	db: any,
	scope: BankScope,
	ignoreSample: boolean,
): Promise<typeof questionBanks.$inferSelect | null> {
	const banks: Array<typeof questionBanks.$inferSelect> = await db
		.select()
		.from(questionBanks)
		.where(eq(questionBanks.classSessionId, scope.classSessionId));

	return (
		banks
			.filter((b) => (b.courseMaterialId ?? null) === scope.materialId)
			.filter((b) => !(ignoreSample && b.generator === SAMPLE_GENERATOR_ID))
			.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
	);
}

/**
 * Devolve o banco de perguntas do escopo, gerando-o na primeira vez. Quando PDFs da
 * aula foram lidos depois da última geração, gera perguntas novas só deles e soma ao banco.
 */
export async function ensureBank(
	db: any,
	deps: Deps,
	scope: BankScope,
): Promise<typeof questionBanks.$inferSelect> {
	const realAi = deps.quizGenerator.id !== SAMPLE_GENERATOR_ID;
	const materials: Array<typeof courseMaterials.$inferSelect> = await db
		.select()
		.from(courseMaterials)
		.where(eq(courseMaterials.classSessionId, scope.classSessionId));

	const inScope = scope.materialId
		? materials.filter((m) => m.id === scope.materialId)
		: materials;
	const ingested = inScope.filter((m) => m.ingestionStatus === "ready" && m.ingestedAt);
	const latest = ingested.reduce<Date | null>(
		(max, m) => (!max || (m.ingestedAt as Date) > max ? (m.ingestedAt as Date) : max),
		null,
	);

	const bank = await findBank(db, scope, realAi);

	if (!bank) {
		const questions = await generateQuestions(
			deps,
			scope.classSessionId,
			ingested.length,
			scope.materialId ? [scope.materialId] : undefined,
		);
		const [created] = await db
			.insert(questionBanks)
			.values({
				classSessionId: scope.classSessionId,
				courseMaterialId: scope.materialId,
				generator: deps.quizGenerator.id,
				questionsJson: questions,
				sourceIngestedAt: latest,
			})
			.returning();
		return created;
	}

	const covered = bank.sourceIngestedAt;
	const newer = ingested.filter((m) => !covered || (m.ingestedAt as Date) > covered);
	if (scope.materialId || !latest || newer.length === 0) return bank;

	try {
		const fresh = await generateQuestions(
			deps,
			scope.classSessionId,
			newer.length,
			newer.map((m) => m.id),
		);
		const existing = bank.questionsJson as StoredQuizQuestion[];
		const known = new Set(existing.map((q) => normalize(q.text)));
		const merged = [
			...existing,
			...fresh.filter((q) => !known.has(normalize(q.text))),
		].slice(-MAX_QUESTIONS_IN_BANK);

		const [updated] = await db
			.update(questionBanks)
			.set({ questionsJson: merged, sourceIngestedAt: latest, updatedAt: new Date() })
			.where(eq(questionBanks.id, bank.id))
			.returning();
		return updated ?? bank;
	} catch {
		// Falha ao ampliar o banco não impede o quiz: usa as perguntas que já existem e tenta de novo depois.
		return bank;
	}
}

/** IDs das perguntas que o aluno já respondeu em qualquer quiz. */
export async function seenQuestionIds(db: any, userId: string): Promise<Set<string>> {
	const attempts: Array<typeof quizAttempts.$inferSelect> = await db
		.select()
		.from(quizAttempts)
		.where(eq(quizAttempts.userId, userId));

	const seen = new Set<string>();
	for (const attempt of attempts) {
		for (const answer of (attempt.answersJson as Array<{ questionId: string }>) ?? []) {
			seen.add(answer.questionId);
		}
	}
	return seen;
}

/** Sorteia `count` perguntas, dando preferência às que o aluno ainda não viu. */
export function pickQuestions(
	bank: StoredQuizQuestion[],
	seen: Set<string>,
	count: number,
	random: () => number = Math.random,
): StoredQuizQuestion[] {
	const unseen = shuffle(
		bank.filter((q) => !seen.has(q.id)),
		random,
	);
	const picked = unseen.slice(0, count);
	if (picked.length < count) {
		const repeats = shuffle(
			bank.filter((q) => seen.has(q.id)),
			random,
		);
		picked.push(...repeats.slice(0, count - picked.length));
	}
	return shuffle(picked, random);
}

export async function drawQuiz(
	db: any,
	deps: Deps,
	input: BankScope & { userId: string; scopeLabel: string; count?: number },
): Promise<typeof quizzes.$inferSelect> {
	const bank = await ensureBank(db, deps, input);
	const seen = await seenQuestionIds(db, input.userId);

	const questionsJson = pickQuestions(
		bank.questionsJson as StoredQuizQuestion[],
		seen,
		input.count ?? QUIZ_QUESTION_COUNT,
	).map((question) => ({ ...question, options: shuffle(question.options) }));

	const [created] = await db
		.insert(quizzes)
		.values({
			classSessionId: input.classSessionId,
			title: `Quiz de revisão · ${input.scopeLabel} · ${new Date().toLocaleDateString("pt-BR")}`,
			difficulty: DIFFICULTY,
			questionsJson,
		})
		.returning();

	return created;
}
