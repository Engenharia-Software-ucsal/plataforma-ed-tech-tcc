import { beforeEach, describe, expect, it } from "vitest";
import { appRouter } from "../src/trpc/router.js";
import {
	courseMaterials,
	noteLinks,
	notes,
	quizAttempts,
	quizzes,
} from "../src/db/schema/index.js";

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
						const filtered = store.filter((item) => matchesCondition(item, cond));
						const p: any = Promise.resolve(filtered);
						p.orderBy = () => Promise.resolve(filtered);
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
						const index = store.findIndex((item) => matchesCondition(item, cond));
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

describe("Notes tRPC Router", () => {
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

	it("should create a note with tags and return the created record", async () => {
		const created = await caller.notes.create({
			title: "Princípio Aberto-Fechado (OCP)",
			content: "Entidades devem ser abertas para extensão, mas fechadas para modificação.",
			tags: ["solid", "arquitetura", "engenharia"],
		});

		expect(created.id).toBeDefined();
		expect(created.title).toBe("Princípio Aberto-Fechado (OCP)");
		expect(created.tags).toEqual(["solid", "arquitetura", "engenharia"]);
		expect(created.userId).toBe(mockUser.id);
		expect(mockDb.notesStore.length).toBe(1);
	});

	it("should throw UNAUTHORIZED when user is not in context and no userId is provided", async () => {
		const unauthCaller = appRouter.createCaller({
			db: mockDb as any,
			user: null,
			req: {} as any,
			res: {} as any,
		});

		await expect(
			unauthCaller.notes.create({
				title: "Sem usuário",
				content: "Conteúdo sem autenticação",
			}),
		).rejects.toThrow("Usuário não autenticado");
	});

	it("should list notes belonging to the authenticated user", async () => {
		await caller.notes.create({
			title: "Nota 1",
			content: "Conteúdo 1",
			tags: ["solid"],
		});
		await caller.notes.create({
			title: "Nota 2",
			content: "Conteúdo 2",
			tags: ["patterns"],
		});

		const list = await caller.notes.list();
		expect(list.length).toBe(2);

		const filteredByTag = await caller.notes.list({ tag: "patterns" });
		expect(filteredByTag.length).toBe(1);
		expect(filteredByTag[0].title).toBe("Nota 2");
	});

	it("should get a note by id with outbound and inbound links and reasons", async () => {
		const noteA = await caller.notes.create({
			title: "Nota A: Injeção de Dependência",
			content: "Técnica para desacoplamento de módulos.",
			tags: ["di", "solid"],
		});

		const noteB = await caller.notes.create({
			title: "Nota B: Inversão de Controle",
			content: "Framework assume o controle do fluxo da aplicação.",
			tags: ["ioc", "solid"],
		});

		// Adicionar link de A para B com justificativa explícita (reason)
		const link = await caller.notes.addLink({
			sourceNoteId: noteA.id,
			targetNoteId: noteB.id,
			reason: "A Injeção de Dependência é uma das principais formas práticas de implementar a Inversão de Controle.",
		});

		expect(link.id).toBeDefined();
		expect(link.reason).toContain("Injeção de Dependência");

		// Buscar Nota A (deve ter outboundLink para B)
		const detailA = await caller.notes.getById({ id: noteA.id });
		expect(detailA.id).toBe(noteA.id);
		expect(detailA.outboundLinks.length).toBe(1);
		expect(detailA.outboundLinks[0].targetNoteId).toBe(noteB.id);
		expect(detailA.outboundLinks[0].reason).toBe(link.reason);

		// Buscar Nota B (deve ter inboundLink vindo de A)
		const detailB = await caller.notes.getById({ id: noteB.id });
		expect(detailB.id).toBe(noteB.id);
		expect(detailB.inboundLinks.length).toBe(1);
		expect(detailB.inboundLinks[0].sourceNoteId).toBe(noteA.id);
		expect(detailB.inboundLinks[0].reason).toBe(link.reason);
	});

	it("should throw NOT_FOUND when getting non-existent note", async () => {
		const nonExistentId = crypto.randomUUID();
		await expect(
			caller.notes.getById({ id: nonExistentId }),
		).rejects.toThrow("Nota não encontrada");
	});

	it("should update a note title and content", async () => {
		const created = await caller.notes.create({
			title: "Título Inicial",
			content: "Conteúdo Inicial",
		});

		const updated = await caller.notes.update({
			id: created.id,
			title: "Título Atualizado",
			content: "Conteúdo Atualizado",
		});

		expect(updated.title).toBe("Título Atualizado");
		expect(updated.content).toBe("Conteúdo Atualizado");
	});

	it("should delete a note and remove its associated links", async () => {
		const noteA = await caller.notes.create({
			title: "Nota A",
			content: "Conteúdo",
		});
		const noteB = await caller.notes.create({
			title: "Nota B",
			content: "Conteúdo",
		});

		await caller.notes.addLink({
			sourceNoteId: noteA.id,
			targetNoteId: noteB.id,
			reason: "Conexão de teste para deleção.",
		});

		expect(mockDb.linksStore.length).toBe(1);

		const deleteResult = await caller.notes.delete({ id: noteA.id });
		expect(deleteResult.success).toBe(true);
		expect(mockDb.notesStore.length).toBe(1);
		expect(mockDb.linksStore.length).toBe(0);
	});

	it("should require reason with at least 3 characters when adding link", async () => {
		const noteA = await caller.notes.create({
			title: "Nota A",
			content: "Conteúdo",
		});
		const noteB = await caller.notes.create({
			title: "Nota B",
			content: "Conteúdo",
		});

		// Deve falhar com razão de menos de 3 caracteres
		await expect(
			caller.notes.addLink({
				sourceNoteId: noteA.id,
				targetNoteId: noteB.id,
				reason: "ok", // apenas 2 caracteres
			}),
		).rejects.toThrow();

		// Deve funcionar com 3 ou mais caracteres
		const link = await caller.notes.addLink({
			sourceNoteId: noteA.id,
			targetNoteId: noteB.id,
			reason: "Vínculo conceitual válido",
		});
		expect(link.reason).toBe("Vínculo conceitual válido");
	});

	it("should reject linking a note to itself", async () => {
		const noteA = await caller.notes.create({
			title: "Nota Auto",
			content: "Conteúdo",
		});

		await expect(
			caller.notes.addLink({
				sourceNoteId: noteA.id,
				targetNoteId: noteA.id,
				reason: "Tentativa de auto-vínculo",
			}),
		).rejects.toThrow("Uma nota não pode ser vinculada a ela mesma");
	});

	it("should reject duplicate links between the same notes", async () => {
		const noteA = await caller.notes.create({
			title: "Nota A",
			content: "Conteúdo",
		});
		const noteB = await caller.notes.create({
			title: "Nota B",
			content: "Conteúdo",
		});

		await caller.notes.addLink({
			sourceNoteId: noteA.id,
			targetNoteId: noteB.id,
			reason: "Primeiro vínculo",
		});

		await expect(
			caller.notes.addLink({
				sourceNoteId: noteA.id,
				targetNoteId: noteB.id,
				reason: "Tentativa de vínculo duplicado",
			}),
		).rejects.toThrow("Este vínculo já existe entre as notas");
	});

	it("should suggest links based on shared tags", async () => {
		const noteA = await caller.notes.create({
			title: "Factory Method",
			content: "Padrão criacional de objetos.",
			tags: ["design-patterns", "gof"],
		});

		const noteB = await caller.notes.create({
			title: "Abstract Factory",
			content: "Famílias de objetos relacionados.",
			tags: ["design-patterns", "criacional"],
		});

		const suggestions = await caller.notes.suggestLinks({ noteId: noteA.id });
		expect(suggestions.length).toBe(1);
		expect(suggestions[0].targetNoteId).toBe(noteB.id);
		expect(suggestions[0].reason).toContain("design-patterns");
		expect(suggestions[0].linkType).toBe("ai_suggested");
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
		mockDb.quizzesStore.push({
			id: quizId,
			classSessionId,
			title: "Quiz 1 - Arquitetura de Software",
			difficulty: "medio",
			questionsJson: [{ question: "O que é OCP?" }],
			createdAt: new Date(),
		});

		const quiz = await caller.quiz.getByClass({ classSessionId });
		expect(quiz?.id).toBe(quizId);

		const attempt = await caller.quiz.submitAttempt({
			quizId,
			score: 85,
			answersJson: { q1: "b" },
			timeSpentSeconds: 120,
		});

		expect(attempt.quizId).toBe(quizId);
		expect(attempt.score).toBe("85");
		expect(attempt.timeSpentSeconds).toBe(120);
	});
});
