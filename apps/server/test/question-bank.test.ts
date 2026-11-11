import { describe, expect, it, vi } from "vitest";
import { createFakeQuizGenerator } from "../src/services/quiz/fake-generator.js";
import type {
	ContextRetriever,
	QuizGenerator,
	QuizQuestionDraft,
	StoredQuizQuestion,
} from "../src/services/quiz/ports.js";
import {
	drawQuiz,
	ensureBank,
	pickQuestions,
	questionRangeFor,
	seenQuestionIds,
	shuffle,
} from "../src/services/quiz/question-bank.service.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

function stored(n: number): StoredQuizQuestion[] {
	return Array.from({ length: n }, (_, i) => ({
		id: `q${i}`,
		topic: "t",
		text: `pergunta ${i}`,
		explanation: "e",
		sourceExcerpt: "s",
		options: [
			{ id: `q${i}-a`, text: "a", correct: true },
			{ id: `q${i}-b`, text: "b", correct: false },
		],
	}));
}

function drafts(prefix: string, n: number): QuizQuestionDraft[] {
	return Array.from({ length: n }, (_, i) => ({
		topic: "t",
		text: `${prefix} ${i}`,
		options: [
			{ text: "a", correct: true },
			{ text: "b", correct: false },
		],
		explanation: "e",
		sourceExcerpt: "s",
	}));
}

function deps(over: { generator?: QuizGenerator; retriever?: ContextRetriever } = {}) {
	const generator: QuizGenerator = over.generator ?? {
		id: "teste:modelo",
		generate: vi.fn(async () => drafts("nova", 12)),
	};
	const retriever: ContextRetriever = over.retriever ?? {
		getContext: vi.fn(async () => ["contexto"]),
	};
	return { contextRetriever: retriever, quizGenerator: generator };
}

function readyMaterial(id: string, ingestedAt: string) {
	return {
		id,
		classSessionId: CLASS_ID,
		title: id,
		materialType: "pdf",
		ingestionStatus: "ready",
		ingestedAt: new Date(ingestedAt),
	};
}

describe("shuffle e pickQuestions", () => {
	it("shuffle mantém os mesmos itens, sem alterar a lista original", () => {
		const original = [1, 2, 3, 4, 5];
		const result = shuffle(original);
		expect([...result].sort()).toEqual(original);
		expect(original).toEqual([1, 2, 3, 4, 5]);
	});

	it("sorteia só entre as perguntas que o aluno ainda não viu", () => {
		const picked = pickQuestions(stored(10), new Set(["q0", "q1", "q2", "q3", "q4"]), 5);
		expect(picked.map((q) => q.id).sort()).toEqual(["q5", "q6", "q7", "q8", "q9"]);
	});

	it("completa com perguntas já vistas quando restam poucas novas", () => {
		const picked = pickQuestions(stored(10), new Set(["q0", "q1", "q2", "q3", "q4", "q5", "q6", "q7"]), 5);
		expect(picked).toHaveLength(5);
		expect(new Set(picked.map((q) => q.id)).size).toBe(5);
		expect(picked.map((q) => q.id)).toEqual(expect.arrayContaining(["q8", "q9"]));
	});

	it("recomeça o ciclo quando o aluno já viu tudo", () => {
		const all = new Set(stored(10).map((q) => q.id));
		expect(pickQuestions(stored(10), all, 5)).toHaveLength(5);
	});

	it("devolve menos perguntas quando o banco é menor que o pedido", () => {
		expect(pickQuestions(stored(3), new Set(), 5)).toHaveLength(3);
	});
});

describe("questionRangeFor", () => {
	it("pede de 10 a 20 perguntas com até 2 documentos", () => {
		for (const count of [0, 1, 2]) {
			expect(questionRangeFor(count)).toEqual({ minQuestions: 10, maxQuestions: 20 });
		}
	});

	it("pede de 15 a 20 perguntas com mais de 2 documentos", () => {
		for (const count of [3, 12]) {
			expect(questionRangeFor(count)).toEqual({ minQuestions: 15, maxQuestions: 20 });
		}
	});
});

describe("seenQuestionIds", () => {
	it("junta as perguntas respondidas por aquele aluno, em qualquer quiz", async () => {
		const db = createClassroomMockDatabase();
		db.attemptsStore.push(
			{ id: "1", userId: "ana", answersJson: [{ questionId: "q1" }, { questionId: "q2" }] },
			{ id: "2", userId: "ana", answersJson: [{ questionId: "q2" }, { questionId: "q3" }] },
			{ id: "3", userId: "davi", answersJson: [{ questionId: "q9" }] },
		);

		expect([...(await seenQuestionIds(db, "ana"))].sort()).toEqual(["q1", "q2", "q3"]);
	});
});

describe("ensureBank", () => {
	it("gera o banco na primeira vez, com identificação de quem gerou, e o reaproveita depois", async () => {
		const db = createClassroomMockDatabase();
		const d = deps();
		const scope = { classSessionId: CLASS_ID, materialId: null };

		const first = await ensureBank(db, d, scope);
		const second = await ensureBank(db, d, scope);

		expect(first.generator).toBe("teste:modelo");
		expect((first.questionsJson as unknown[]).length).toBe(12);
		expect(second.id).toBe(first.id);
		expect(d.quizGenerator.generate).toHaveBeenCalledTimes(1);
		expect(d.quizGenerator.generate).toHaveBeenCalledWith(
			expect.objectContaining({ minQuestions: 10, maxQuestions: 20 }),
		);
	});

	it("com mais de 2 PDFs lidos na aula, pede de 15 a 20 perguntas; num único PDF, de 10 a 20", async () => {
		const db = createClassroomMockDatabase();
		db.materialsStore.push(
			readyMaterial("m1", "2026-11-01T10:00:00Z"),
			readyMaterial("m2", "2026-11-01T10:00:00Z"),
			readyMaterial("m3", "2026-11-01T10:00:00Z"),
		);
		const d = deps();

		await ensureBank(db, d, { classSessionId: CLASS_ID, materialId: null });
		await ensureBank(db, d, { classSessionId: CLASS_ID, materialId: "m1" });

		expect(d.quizGenerator.generate).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ minQuestions: 15, maxQuestions: 20 }),
		);
		expect(d.quizGenerator.generate).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ minQuestions: 10, maxQuestions: 20 }),
		);
	});

	it("mantém bancos separados para a aula inteira e para cada documento", async () => {
		const db = createClassroomMockDatabase();
		const d = deps();

		await ensureBank(db, d, { classSessionId: CLASS_ID, materialId: null });
		await ensureBank(db, d, { classSessionId: CLASS_ID, materialId: "m1" });
		await ensureBank(db, d, { classSessionId: CLASS_ID, materialId: "m1" });

		expect(db.banksStore).toHaveLength(2);
		expect(d.contextRetriever.getContext).toHaveBeenCalledWith(CLASS_ID, { materialIds: ["m1"] });
		expect(d.contextRetriever.getContext).toHaveBeenCalledWith(CLASS_ID, { materialIds: undefined });
	});

	it("com IA real, ignora o banco de exemplo e gera um novo", async () => {
		const db = createClassroomMockDatabase();
		const scope = { classSessionId: CLASS_ID, materialId: null };
		const sampleDeps = { contextRetriever: deps().contextRetriever, quizGenerator: createFakeQuizGenerator() };
		const sample = await ensureBank(db, sampleDeps, scope);
		expect(sample.generator).toBe("sample");

		const real = await ensureBank(db, deps(), scope);

		expect(real.id).not.toBe(sample.id);
		expect(real.generator).toBe("teste:modelo");
		expect(db.banksStore).toHaveLength(2);
	});

	it("sem IA real, reaproveita o banco de exemplo", async () => {
		const db = createClassroomMockDatabase();
		const scope = { classSessionId: CLASS_ID, materialId: null };
		const d = { contextRetriever: deps().contextRetriever, quizGenerator: createFakeQuizGenerator() };

		const first = await ensureBank(db, d, scope);
		const second = await ensureBank(db, d, scope);

		expect(second.id).toBe(first.id);
		expect(db.banksStore).toHaveLength(1);
	});

	it("soma perguntas novas só dos PDFs lidos depois da última geração", async () => {
		const db = createClassroomMockDatabase();
		db.materialsStore.push(readyMaterial("m1", "2026-11-01T10:00:00Z"));
		const generate = vi
			.fn()
			.mockResolvedValueOnce(drafts("velha", 10))
			.mockResolvedValueOnce(drafts("nova", 10));
		const d = deps({ generator: { id: "teste:modelo", generate } });
		const scope = { classSessionId: CLASS_ID, materialId: null };

		const first = await ensureBank(db, d, scope);
		expect(first.sourceIngestedAt).toEqual(new Date("2026-11-01T10:00:00Z"));

		db.materialsStore.push(readyMaterial("m2", "2026-11-05T10:00:00Z"));
		const second = await ensureBank(db, d, scope);

		expect(second.id).toBe(first.id);
		expect((second.questionsJson as unknown[]).length).toBe(20);
		expect(second.sourceIngestedAt).toEqual(new Date("2026-11-05T10:00:00Z"));
		expect(d.contextRetriever.getContext).toHaveBeenLastCalledWith(CLASS_ID, { materialIds: ["m2"] });
		expect(generate).toHaveBeenCalledTimes(2);
	});

	it("não duplica perguntas iguais ao somar as novas", async () => {
		const db = createClassroomMockDatabase();
		db.materialsStore.push(readyMaterial("m1", "2026-11-01T10:00:00Z"));
		const generate = vi
			.fn()
			.mockResolvedValueOnce(drafts("igual", 10))
			.mockResolvedValueOnce([...drafts("igual", 3), ...drafts("outra", 2)]);
		const d = deps({ generator: { id: "teste:modelo", generate } });
		const scope = { classSessionId: CLASS_ID, materialId: null };

		await ensureBank(db, d, scope);
		db.materialsStore.push(readyMaterial("m2", "2026-11-05T10:00:00Z"));
		const merged = await ensureBank(db, d, scope);

		expect((merged.questionsJson as unknown[]).length).toBe(12);
	});

	it("se a ampliação falhar, usa o banco que já existe e tenta de novo depois", async () => {
		const db = createClassroomMockDatabase();
		db.materialsStore.push(readyMaterial("m1", "2026-11-01T10:00:00Z"));
		const generate = vi
			.fn()
			.mockResolvedValueOnce(drafts("velha", 10))
			.mockRejectedValueOnce(new Error("provedor fora"))
			.mockResolvedValueOnce(drafts("nova", 10));
		const d = deps({ generator: { id: "teste:modelo", generate } });
		const scope = { classSessionId: CLASS_ID, materialId: null };

		const first = await ensureBank(db, d, scope);
		db.materialsStore.push(readyMaterial("m2", "2026-11-05T10:00:00Z"));

		const failed = await ensureBank(db, d, scope);
		expect((failed.questionsJson as unknown[]).length).toBe(10);
		expect(failed.sourceIngestedAt).toEqual(first.sourceIngestedAt);

		const retried = await ensureBank(db, d, scope);
		expect((retried.questionsJson as unknown[]).length).toBe(20);
	});

	it("banco de um único documento não é ampliado", async () => {
		const db = createClassroomMockDatabase();
		db.materialsStore.push(readyMaterial("m1", "2026-11-01T10:00:00Z"));
		const d = deps();
		const scope = { classSessionId: CLASS_ID, materialId: "m1" };

		await ensureBank(db, d, scope);
		db.materialsStore[0].ingestedAt = new Date("2026-11-09T10:00:00Z");
		await ensureBank(db, d, scope);

		expect(d.quizGenerator.generate).toHaveBeenCalledTimes(1);
	});
});

describe("drawQuiz", () => {
	it("salva um quiz de 5 perguntas do banco, com os mesmos IDs, e título do escopo", async () => {
		const db = createClassroomMockDatabase();
		const quiz = await drawQuiz(db, deps(), {
			userId: "ana",
			classSessionId: CLASS_ID,
			materialId: null,
			scopeLabel: "Todos os materiais",
		});

		const bankIds = new Set(
			(db.banksStore[0].questionsJson as StoredQuizQuestion[]).map((q) => q.id),
		);
		const questions = quiz.questionsJson as StoredQuizQuestion[];
		expect(questions).toHaveLength(5);
		expect(questions.every((q) => bankIds.has(q.id))).toBe(true);
		expect(quiz.title).toContain("Todos os materiais");
		expect(db.quizzesStore).toHaveLength(1);
	});
});
