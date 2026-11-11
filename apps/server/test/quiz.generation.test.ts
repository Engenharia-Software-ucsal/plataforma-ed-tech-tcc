import { beforeEach, describe, expect, it, vi } from "vitest";
import { findLatestClassQuiz, scoreAttempt } from "../src/services/quiz/generation.service.js";
import { appRouter } from "../src/trpc/router.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

describe("scoreAttempt", () => {
	it("calcula a nota a partir das respostas corretas", () => {
		const questions = [
			{
				id: "q1",
				topic: "SOLID",
				text: "...",
				explanation: "exp1",
				sourceExcerpt: "...",
				options: [
					{ id: "a", text: "certo", correct: true },
					{ id: "b", text: "errado", correct: false },
				],
			},
			{
				id: "q2",
				topic: "SOLID",
				text: "...",
				explanation: "exp2",
				sourceExcerpt: "...",
				options: [
					{ id: "c", text: "certo", correct: true },
					{ id: "d", text: "errado", correct: false },
				],
			},
		];

		const result = scoreAttempt(questions, [
			{ questionId: "q1", optionId: "a" },
			{ questionId: "q2", optionId: "d" },
		]);

		expect(result.correct).toBe(1);
		expect(result.total).toBe(2);
		expect(result.score).toBe(50);
		expect(result.results.find((r) => r.questionId === "q1")?.correct).toBe(true);
		expect(result.results.find((r) => r.questionId === "q2")?.correct).toBe(false);
	});

	it("não quebra quando a resposta não corresponde a nenhuma opção válida", () => {
		const questions = [
			{
				id: "q1",
				topic: "X",
				text: "...",
				explanation: "...",
				sourceExcerpt: "...",
				options: [{ id: "a", text: "certo", correct: true }],
			},
		];
		const result = scoreAttempt(questions, [{ questionId: "q1", optionId: "inexistente" }]);
		expect(result.correct).toBe(0);
		expect(result.score).toBe(0);
	});
});

describe("findLatestClassQuiz", () => {
	it("devolve o quiz mais novo quando a aula tem mais de um", async () => {
		const db = createClassroomMockDatabase();
		db.quizzesStore.push(
			{ id: "antigo", classSessionId: CLASS_ID, createdAt: new Date("2026-11-01T10:00:00.000Z") },
			{ id: "novo", classSessionId: CLASS_ID, createdAt: new Date("2026-11-02T10:00:00.000Z") },
			{
				id: "outra-aula",
				classSessionId: "22222222-2222-4222-8222-222222222222",
				createdAt: new Date("2026-11-03T10:00:00.000Z"),
			},
		);

		expect((await findLatestClassQuiz(db, CLASS_ID))?.id).toBe("novo");
	});

	it("devolve null quando a aula não tem quiz", async () => {
		expect(await findLatestClassQuiz(createClassroomMockDatabase(), CLASS_ID)).toBeNull();
	});
});

describe("quiz tRPC router", () => {
	const mockUser = {
		id: "user-1",
		name: "Aluno",
		email: "aluno@ucsal.edu.br",
		avatarUrl: null,
		googleId: "g-1",
		googleRefreshToken: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	let db: ReturnType<typeof createClassroomMockDatabase>;

	function callerFor(user: any, database: any = db) {
		return appRouter.createCaller({ db: database, user, req: {} as any, res: {} as any });
	}

	function answerCorrectly(quizId: string) {
		const quiz = db.quizzesStore.find((q) => q.id === quizId);
		return quiz.questionsJson.map((q: any) => ({
			questionId: q.id,
			optionId: q.options.find((o: any) => o.correct).id,
		}));
	}

	beforeEach(() => {
		vi.stubEnv("QUIZ_AI_PROVIDER", "");
		vi.stubEnv("EMBEDDING_PROVIDER", "");
		db = createClassroomMockDatabase();
		db.classSessionsStore.push({ id: CLASS_ID, subject: "BD", topics: ["SOLID"] });
		db.enrollmentsStore.push(
			{ id: "e1", userId: "user-1", classSessionId: CLASS_ID },
			{ id: "e2", userId: "user-2", classSessionId: CLASS_ID },
		);
	});

	it("rejeita requestGeneration sem autenticação", async () => {
		await expect(
			callerFor(null).quiz.requestGeneration({ classSessionId: CLASS_ID }),
		).rejects.toThrow("Usuário não autenticado");
	});

	it("rejeita quem não está matriculado na aula", async () => {
		await expect(
			callerFor({ ...mockUser, id: "intruso" }).quiz.requestGeneration({
				classSessionId: CLASS_ID,
			}),
		).rejects.toThrow("Class session not found");
	});

	it("sorteia 5 perguntas de um banco de 10 a 20, com o gabarito para o app, e corrige a nota no servidor", async () => {
		const { quizId } = await callerFor(mockUser).quiz.requestGeneration({
			classSessionId: CLASS_ID,
		});

		expect(db.banksStore).toHaveLength(1);
		expect(db.banksStore[0].questionsJson.length).toBeGreaterThanOrEqual(10);
		expect(db.banksStore[0].questionsJson.length).toBeLessThanOrEqual(20);

		const publicQuiz = await callerFor(mockUser).quiz.getById({ quizId });
		expect(publicQuiz.questionsJson).toHaveLength(5);
		const options = (publicQuiz.questionsJson[0] as any).options;
		expect(options.filter((o: any) => o.correct)).toHaveLength(1);
		expect(publicQuiz.questionsJson[0]).toHaveProperty("explanation");

		const attempt = await callerFor(mockUser).quiz.submitAttempt({
			quizId,
			answers: answerCorrectly(quizId),
			timeSpentSeconds: 42,
		});
		expect(attempt.correct).toBe(5);
		expect(attempt.score).toBe(100);
		expect(db.attemptsStore[0].userId).toBe("user-1");
	});

	it("alunos diferentes sorteiam do mesmo banco, cada um com o seu quiz", async () => {
		const first = await callerFor(mockUser).quiz.requestGeneration({ classSessionId: CLASS_ID });
		const second = await callerFor({ ...mockUser, id: "user-2" }).quiz.requestGeneration({
			classSessionId: CLASS_ID,
		});

		expect(db.banksStore).toHaveLength(1);
		expect(db.quizzesStore).toHaveLength(2);
		expect(second.quizId).not.toBe(first.quizId);
	});

	it("não repete perguntas já respondidas e recomeça o ciclo quando o banco acaba", async () => {
		const caller = callerFor(mockUser);
		const ids = (quizId: string) =>
			db.quizzesStore.find((q) => q.id === quizId).questionsJson.map((q: any) => q.id);

		const q1 = (await caller.quiz.requestGeneration({ classSessionId: CLASS_ID })).quizId;
		await caller.quiz.submitAttempt({ quizId: q1, answers: answerCorrectly(q1), timeSpentSeconds: 1 });
		const q2 = (await caller.quiz.requestGeneration({ classSessionId: CLASS_ID })).quizId;

		expect(ids(q2).filter((id: string) => ids(q1).includes(id))).toHaveLength(0);

		await caller.quiz.submitAttempt({ quizId: q2, answers: answerCorrectly(q2), timeSpentSeconds: 1 });
		const q3 = (await caller.quiz.requestGeneration({ classSessionId: CLASS_ID })).quizId;

		expect(ids(q3)).toHaveLength(5);
		expect(db.banksStore).toHaveLength(1);
	});

	it("informa o erro quando a geração falha", async () => {
		const failing = { ...db, insert: () => { throw new Error("banco fora"); } };
		await expect(
			callerFor(mockUser, failing).quiz.requestGeneration({ classSessionId: CLASS_ID }),
		).rejects.toThrow("Não foi possível gerar o quiz");
	});

	it("rejeita documento que não é da aula", async () => {
		db.materialsStore.push({
			id: "99999999-9999-4999-8999-999999999999",
			classSessionId: "22222222-2222-4222-8222-222222222222",
			title: "Outro.pdf",
			ingestionStatus: "ready",
		});
		await expect(
			callerFor(mockUser).quiz.requestGeneration({
				classSessionId: CLASS_ID,
				materialId: "99999999-9999-4999-8999-999999999999",
			}),
		).rejects.toThrow("Documento não encontrado");
	});

	it("quiz de um único documento exige a leitura dos PDFs configurada", async () => {
		db.materialsStore.push({
			id: "88888888-8888-4888-8888-888888888888",
			classSessionId: CLASS_ID,
			title: "Slides.pdf",
			ingestionStatus: "pending",
		});
		await expect(
			callerFor(mockUser).quiz.requestGeneration({
				classSessionId: CLASS_ID,
				materialId: "88888888-8888-4888-8888-888888888888",
			}),
		).rejects.toThrow("exige a leitura dos PDFs");
	});
});
