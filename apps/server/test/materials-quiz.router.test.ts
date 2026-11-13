import { beforeEach, describe, expect, it } from "vitest";
import {
	courseMaterials,
	noteLinks,
	notes,
	quizAttempts,
	quizzes,
} from "../src/db/schema/index.js";
import { appRouter } from "../src/trpc/router.js";

// Helper para extrair colunas e parâmetros das condições SQL do Drizzle
function findParams(chunk: any, results: any[] = []): any[] {
	if (!chunk) return results;
	if (chunk.value !== undefined && !Array.isArray(chunk.value)) {
		results.push(chunk.value);
	}
	if (Array.isArray(chunk.queryChunks)) {
		for (const sub of chunk.queryChunks) findParams(sub, results);
	}
	return results;
}

function findColumns(chunk: any, results: string[] = []): string[] {
	if (!chunk) return results;
	if (chunk.name && typeof chunk.name === "string") {
		results.push(chunk.name);
	}
	if (Array.isArray(chunk.queryChunks)) {
		for (const sub of chunk.queryChunks) findColumns(sub, results);
	}
	return results;
}

const columnToProp: Record<string, string> = {
	id: "id",
	user_id: "userId",
	class_session_id: "classSessionId",
	source_note_id: "sourceNoteId",
	target_note_id: "targetNoteId",
	reason: "reason",
	title: "title",
	content: "content",
};

function hasOrOperator(cond: any): boolean {
	if (!cond) return false;
	if (
		Array.isArray(cond.value) &&
		cond.value.some((v: any) => typeof v === "string" && v.includes(" or "))
	) {
		return true;
	}
	if (Array.isArray(cond.queryChunks)) {
		return cond.queryChunks.some((sub: any) => hasOrOperator(sub));
	}
	return false;
}

function matchesCondition(item: any, cond: any): boolean {
	if (!cond) return true;
	const isOr = hasOrOperator(cond);
	const cols = findColumns(cond);
	const params = findParams(cond);

	if (cols.length === 0 || params.length === 0) return true;

	if (isOr) {
		for (let i = 0; i < Math.min(cols.length, params.length); i++) {
			const prop = columnToProp[cols[i]] ?? cols[i];
			if (item[prop] === params[i]) {
				return true;
			}
		}
		return false;
	}

	for (let i = 0; i < Math.min(cols.length, params.length); i++) {
		const prop = columnToProp[cols[i]] ?? cols[i];
		if (item[prop] !== undefined && item[prop] !== params[i]) {
			return false;
		}
	}
	return true;
}

function createMockDatabase() {
	const notesStore: any[] = [];
	const linksStore: any[] = [];
	const materialsStore: any[] = [];
	const quizzesStore: any[] = [];
	const attemptsStore: any[] = [];

	function getStore(table: any) {
		if (table === notes) return notesStore;
		if (table === noteLinks) return linksStore;
		if (table === courseMaterials) return materialsStore;
		if (table === quizzes) return quizzesStore;
		if (table === quizAttempts) return attemptsStore;
		return notesStore;
	}

	return {
		notesStore,
		linksStore,
		materialsStore,
		quizzesStore,
		attemptsStore,
		insert: (table: any) => ({
			values: (data: any) => ({
				returning: async () => {
					const store = getStore(table);
					const item = {
						id: data.id ?? crypto.randomUUID(),
						createdAt: new Date(),
						updatedAt: new Date(),
						...data,
					};
					store.push(item);
					return [item];
				},
			}),
		}),
		select: (fields?: any) => ({
			from: (table: any) => {
				const store = getStore(table);
				return {
					where: (cond: any) => {
						const filtered = store.filter((item) =>
							matchesCondition(item, cond),
						);
						const p: any = Promise.resolve(filtered);
						p.orderBy = () => {
							const ordered: any = Promise.resolve(filtered);
							ordered.limit = async (n: number) => filtered.slice(0, n);
							return ordered;
						};
						return p;
					},
					innerJoin: (joinTable: any, joinCond: any) => ({
						where: (cond: any) => {
							const links = linksStore.filter((l) => matchesCondition(l, cond));
							const joined = links.map((l) => {
								if (table === noteLinks && joinTable === notes) {
									// link de saída (sourceNoteId = id) -> junta com targetNote
									const targetNote = notesStore.find(
										(n) => n.id === l.targetNoteId,
									);
									const sourceNote = notesStore.find(
										(n) => n.id === l.sourceNoteId,
									);
									return {
										...l,
										targetNote: targetNote
											? {
													id: targetNote.id,
													title: targetNote.title,
													tags: targetNote.tags,
													createdAt: targetNote.createdAt,
												}
											: null,
										sourceNote: sourceNote
											? {
													id: sourceNote.id,
													title: sourceNote.title,
													tags: sourceNote.tags,
													createdAt: sourceNote.createdAt,
												}
											: null,
									};
								}
								return l;
							});
							return Promise.resolve(joined);
						},
					}),
					orderBy: () => Promise.resolve([...store]),
				};
			},
		}),
		update: (table: any) => ({
			set: (data: any) => ({
				where: (cond: any) => ({
					returning: async () => {
						const store = getStore(table);
						const index = store.findIndex((item) =>
							matchesCondition(item, cond),
						);
						if (index === -1) return [];
						store[index] = { ...store[index], ...data, updatedAt: new Date() };
						return [store[index]];
					},
				}),
			}),
		}),
		delete: (table: any) => ({
			where: async (cond: any) => {
				const store = getStore(table);
				let i = store.length;
				while (i--) {
					if (matchesCondition(store[i], cond)) {
						store.splice(i, 1);
					}
				}
				return;
			},
		}),
	};
}

describe("Materials and Quiz tRPC Routers", () => {
	const mockUser = {
		id: crypto.randomUUID(),
		name: "Aluno de Engenharia",
		email: "aluno@ucsal.edu.br",
		avatarUrl: null,
		googleId: "google-uid-123",
		googleRefreshToken: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	let mockDb: ReturnType<typeof createMockDatabase>;
	let caller: ReturnType<typeof appRouter.createCaller>;

	beforeEach(() => {
		mockDb = createMockDatabase();
		caller = appRouter.createCaller({
			db: mockDb as any,
			user: mockUser,
			req: {} as any,
			res: {} as any,
		});
	});

	it("should list materials and submit quiz attempts", async () => {
		const classSessionId = crypto.randomUUID();

		mockDb.materialsStore.push({
			id: crypto.randomUUID(),
			classSessionId,
			title: "Apostila de Engenharia de Software.pdf",
			fileUrl: "https://storage.ucsal.br/apostila.pdf",
			materialType: "pdf",
			summary: "Resumo sobre processos ágeis",
			createdAt: new Date(),
		});

		const materials = await caller.materials.listByClass({ classSessionId });
		expect(materials.length).toBe(1);
		expect(materials[0].title).toBe("Apostila de Engenharia de Software.pdf");

		const quizId = crypto.randomUUID();
		const correctOptionId = crypto.randomUUID();
		mockDb.quizzesStore.push({
			id: quizId,
			classSessionId,
			title: "Quiz 1 - Arquitetura de Software",
			difficulty: "medio",
			questionsJson: [
				{
					id: "q1",
					topic: "SOLID",
					text: "O que é OCP?",
					explanation: "OCP é o Princípio Aberto-Fechado.",
					sourceExcerpt: "Resumo sobre processos ágeis",
					options: [
						{
							id: correctOptionId,
							text: "Aberto para extensão, fechado para modificação",
							correct: true,
						},
						{
							id: crypto.randomUUID(),
							text: "Outra alternativa",
							correct: false,
						},
					],
				},
			],
			createdAt: new Date(),
		});

		const quiz = await caller.quiz.getByClass({ classSessionId });
		expect(quiz?.id).toBe(quizId);
		// O gabarito vai junto: o app decide quando mostrá-lo
		const publicQuestion = quiz?.questionsJson?.[0] as {
			options: Array<{ correct?: boolean }>;
		};
		expect(publicQuestion.options[0]).toHaveProperty("correct");

		const attempt = await caller.quiz.submitAttempt({
			quizId,
			answers: [{ questionId: "q1", optionId: correctOptionId }],
			timeSpentSeconds: 120,
		});

		expect(attempt.correct).toBe(1);
		expect(attempt.total).toBe(1);
		expect(attempt.score).toBe(100);
		expect(mockDb.attemptsStore[0].userId).toBe(mockUser.id);
		expect(mockDb.attemptsStore[0].timeSpentSeconds).toBe(120);
	});
});
