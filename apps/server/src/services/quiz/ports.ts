/**
 * Portas (interfaces) do pipeline de geração de quiz.
 *
 * Nenhum provedor concreto de IA está escolhido ainda — tudo aqui é
 * agnóstico de propósito. Ver docs/superpowers/specs/2026-11-05-quiz-rag-generation-design.md
 */

export type QuizDifficulty = "facil" | "medio" | "dificil";

export type QuizOptionDraft = {
	text: string;
	correct: boolean;
};

export type QuizQuestionDraft = {
	topic: string;
	text: string;
	options: QuizOptionDraft[]; // exatamente 1 com correct = true
	explanation: string;
	sourceExcerpt: string;
};

/**
 * Shape persistido em `quizzes.questionsJson`. Cada pergunta/opção ganha um
 * id estável para o cliente referenciar na submissão, sem expor qual é a
 * correta antes de o aluno responder (ver `toPublicQuestion` no router).
 */
export type StoredQuizQuestion = {
	id: string;
	topic: string;
	text: string;
	options: Array<{ id: string; text: string; correct: boolean }>;
	explanation: string;
	sourceExcerpt: string;
};

/** A aula não tem material suficiente para o gerador montar um quiz. */
export class InsufficientContextError extends Error {
	constructor(message = "A aula ainda não tem material para gerar o quiz.") {
		super(message);
		this.name = "InsufficientContextError";
	}
}

/**
 * A IA gera um banco de 10 a 20 perguntas (15 a 20 quando o escopo tem mais de
 * `MANY_DOCUMENTS_THRESHOLD` documentos); cada quiz sorteia 5 delas.
 */
export const BANK_MIN_QUESTIONS = 10;
export const BANK_MIN_QUESTIONS_MANY_DOCUMENTS = 15;
export const BANK_MAX_QUESTIONS = 20;
export const MANY_DOCUMENTS_THRESHOLD = 2;
export const QUIZ_QUESTION_COUNT = 5;

export interface ContextRetriever {
	/**
	 * `materialIds` restringe o contexto a esses documentos; sem ele, vale a aula inteira.
	 * Hoje há duas implementações: textos das postagens do Classroom e trechos dos PDFs.
	 */
	getContext(
		classSessionId: string,
		opts?: { materialIds?: string[] },
	): Promise<string[]>;
}

export interface QuizGenerator {
	/** "provedor:modelo" (ou "sample"), gravado junto das perguntas geradas. */
	readonly id: string;
	generate(input: {
		context: string[];
		minQuestions: number;
		maxQuestions: number;
		difficulty: QuizDifficulty;
	}): Promise<QuizQuestionDraft[]>;
}
