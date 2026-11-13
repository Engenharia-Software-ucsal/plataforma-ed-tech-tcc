import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { User } from "../src/db/schema/index.js";
import {
	callerFor,
	createClassSession,
	createTestDatabase,
	createUser,
	type TestDatabase,
} from "./helpers/pglite-db.js";

let testDb: TestDatabase;
let alice: User;
let bob: User;
let api: ReturnType<typeof callerFor>;
let bobApi: ReturnType<typeof callerFor>;

beforeAll(async () => {
	testDb = await createTestDatabase();
});

afterAll(async () => {
	await testDb.close();
});

beforeEach(async () => {
	await testDb.reset();
	alice = await createUser(testDb.db, "Alice");
	bob = await createUser(testDb.db, "Bob");
	api = callerFor(testDb.db, alice);
	bobApi = callerFor(testDb.db, bob);
});

describe("autenticação e isolamento", () => {
	it("exige usuário autenticado", async () => {
		const anonymous = callerFor(testDb.db, null);
		await expect(anonymous.notes.list()).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(anonymous.notes.create({ title: "X" })).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
	});

	it("não deixa um aluno ler, editar, mover, excluir ou vincular notas de outro", async () => {
		const note = await api.notes.create({
			title: "Privada",
			content: "segredo",
		});
		const bobNote = await bobApi.notes.create({ title: "Do Bob" });

		await expect(bobApi.notes.getById({ id: note.id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.notes.update({ id: note.id, content: "x" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.notes.move({ id: note.id, folderId: null }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(bobApi.notes.delete({ id: note.id })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.notes.addLink({
				sourceNoteId: bobNote.id,
				targetNoteId: note.id,
				reason: "roubar",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			bobApi.notes.suggestLinks({ noteId: note.id }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});

		expect((await bobApi.notes.list()).map((n) => n.id)).toEqual([bobNote.id]);
		expect((await api.notes.getById({ id: note.id })).content).toBe("segredo");
	});

	it("não deixa criar nota numa pasta de outro aluno", async () => {
		const folder = await bobApi.folders.create({ name: "Do Bob" });
		await expect(
			api.notes.create({ title: "X", folderId: folder.id }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});

describe("títulos", () => {
	it("apara o título e não deixa repetir, sem diferenciar caixa", async () => {
		const created = await api.notes.create({ title: "  Clean Architecture  " });
		expect(created.title).toBe("Clean Architecture");

		await expect(
			api.notes.create({ title: "clean architecture" }),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
		const other = await api.notes.create({ title: "SOLID" });
		await expect(
			api.notes.update({ id: other.id, title: "CLEAN architecture" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("deixa outro aluno usar o mesmo título", async () => {
		await api.notes.create({ title: "SOLID" });
		await expect(
			bobApi.notes.create({ title: "SOLID" }),
		).resolves.toMatchObject({ title: "SOLID" });
	});

	it("aceita mudar só a caixa do próprio título", async () => {
		const note = await api.notes.create({ title: "solid" });
		await expect(
			api.notes.update({ id: note.id, title: "SOLID" }),
		).resolves.toMatchObject({
			title: "SOLID",
		});
	});

	it.each(["", "   ", "Com [colchete]", "A|B", "Seção #1"])(
		"rejeita o título %j",
		async (title) => {
			await expect(api.notes.create({ title })).rejects.toMatchObject({
				code: "BAD_REQUEST",
			});
		},
	);

	it("libera o título quando a nota vai para a lixeira", async () => {
		const note = await api.notes.create({ title: "Rascunho" });
		await api.notes.delete({ id: note.id });
		await expect(
			api.notes.create({ title: "Rascunho" }),
		).resolves.toMatchObject({
			title: "Rascunho",
		});
	});
});

describe("hashtag da matéria", () => {
	it("cria, troca e remove a tag automática conforme a aula, sem mexer nas tags do aluno", async () => {
		const engSoft = await createClassSession(
			testDb.db,
			"Engenharia de Software",
		);
		const bd = await createClassSession(testDb.db, "Banco de Dados II");

		const note = await api.notes.create({
			title: "Aula 1",
			tags: ["prova"],
			classSessionId: engSoft.id,
		});
		expect(note.autoTags).toEqual(["engenharia-de-software"]);
		expect(note.tags).toEqual(["prova"]);

		const moved = await api.notes.update({
			id: note.id,
			classSessionId: bd.id,
		});
		expect(moved.autoTags).toEqual(["banco-de-dados-ii"]);
		expect(moved.tags).toEqual(["prova"]);

		const unlinked = await api.notes.update({
			id: note.id,
			classSessionId: null,
		});
		expect(unlinked.autoTags).toEqual([]);
		expect(unlinked.classSessionId).toBeNull();
	});

	it("filtra por tag do aluno ou tag automática", async () => {
		const engSoft = await createClassSession(
			testDb.db,
			"Engenharia de Software",
		);
		const daAula = await api.notes.create({
			title: "Da aula",
			classSessionId: engSoft.id,
		});
		const doAluno = await api.notes.create({
			title: "Do aluno",
			tags: ["engenharia-de-software"],
		});
		await api.notes.create({ title: "Outra" });

		const found = await api.notes.list({ tag: "engenharia-de-software" });
		expect(found.map((n) => n.id).sort()).toEqual(
			[daAula.id, doAluno.id].sort(),
		);
	});

	it("recusa aula inexistente", async () => {
		await expect(
			api.notes.create({ title: "X", classSessionId: crypto.randomUUID() }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("wikilinks", () => {
	it("cria vínculos a partir do texto e mostra backlinks", async () => {
		const target = await api.notes.create({ title: "Inversão de Dependência" });
		const source = await api.notes.create({
			title: "Arquitetura Hexagonal",
			content: "Depende de [[inversão de dependência|DIP]] e de [[Ports]].",
		});

		const detail = await api.notes.getById({ id: source.id });
		expect(detail.outboundLinks).toHaveLength(1);
		expect(detail.outboundLinks[0]).toMatchObject({
			targetNoteId: target.id,
			linkType: "wikilink",
			reason: null,
		});
		expect(detail.wikilinks).toEqual([
			{ title: "inversão de dependência", noteId: target.id },
			{ title: "Ports", noteId: null },
		]);

		const targetDetail = await api.notes.getById({ id: target.id });
		expect(targetDetail.inboundLinks.map((l) => l.sourceNoteId)).toEqual([
			source.id,
		]);
	});

	it("resolve links pendentes quando a nota com aquele título passa a existir", async () => {
		const source = await api.notes.create({
			title: "Origem",
			content: "ver [[Futura]]",
		});
		expect(
			(await api.notes.getById({ id: source.id })).outboundLinks,
		).toHaveLength(0);

		const created = await api.notes.create({ title: "Futura" });
		expect(created.affectedNoteIds).toEqual([source.id]);
		const detail = await api.notes.getById({ id: source.id });
		expect(detail.outboundLinks.map((l) => l.targetNoteId)).toEqual([
			created.id,
		]);
	});

	it("ignora links em código, para a própria nota e repetidos", async () => {
		const target = await api.notes.create({ title: "Alvo" });
		const source = await api.notes.create({
			title: "Fonte",
			content: "`[[Alvo]]`\n```\n[[Alvo]]\n```\n[[Fonte]] [[Alvo]] [[alvo]]",
		});
		const detail = await api.notes.getById({ id: source.id });
		expect(detail.outboundLinks.map((l) => l.targetNoteId)).toEqual([
			target.id,
		]);
	});

	it("remove o vínculo quando o link sai do texto", async () => {
		await api.notes.create({ title: "Alvo" });
		const source = await api.notes.create({
			title: "Fonte",
			content: "[[Alvo]]",
		});
		await api.notes.update({ id: source.id, content: "sem link" });
		expect(
			(await api.notes.getById({ id: source.id })).outboundLinks,
		).toHaveLength(0);
	});

	it("propaga a renomeação para as notas que apontam para ela, mantendo apelido e seção", async () => {
		const target = await api.notes.create({ title: "Antigo" });
		const source = await api.notes.create({
			title: "Fonte",
			content:
				"[[Antigo]], [[antigo|apelido]] e [[Antigo#Intro]]; `[[Antigo]]` fica.",
		});

		const renamed = await api.notes.update({ id: target.id, title: "Novo" });
		expect(renamed.affectedNoteIds).toContain(source.id);

		const detail = await api.notes.getById({ id: source.id });
		expect(detail.content).toBe(
			"[[Novo]], [[Novo|apelido]] e [[Novo#Intro]]; `[[Antigo]]` fica.",
		);
		expect(detail.outboundLinks.map((l) => l.targetNoteId)).toEqual([
			target.id,
		]);
	});

	it("ao renomear, também resolve links que já esperavam o título novo", async () => {
		const waiting = await api.notes.create({
			title: "Esperando",
			content: "[[Destino Final]]",
		});
		const note = await api.notes.create({ title: "Rascunho" });
		const renamed = await api.notes.update({
			id: note.id,
			title: "Destino Final",
		});
		expect(renamed.affectedNoteIds).toContain(waiting.id);
		expect(
			(await api.notes.getById({ id: waiting.id })).outboundLinks,
		).toHaveLength(1);
	});

	it("esconde vínculos com notas na lixeira e os devolve ao restaurar", async () => {
		const target = await api.notes.create({ title: "Alvo" });
		const source = await api.notes.create({
			title: "Fonte",
			content: "[[Alvo]]",
		});

		await api.notes.delete({ id: target.id });
		const detail = await api.notes.getById({ id: source.id });
		expect(detail.outboundLinks).toHaveLength(0);
		expect(detail.wikilinks).toEqual([{ title: "Alvo", noteId: null }]);

		await api.trash.restore({ id: target.id, type: "note" });
		expect(
			(await api.notes.getById({ id: source.id })).outboundLinks,
		).toHaveLength(1);
	});
});

describe("vínculos semânticos", () => {
	it("convive com o wikilink do mesmo par e recusa repetidos", async () => {
		const target = await api.notes.create({ title: "Alvo" });
		const source = await api.notes.create({
			title: "Fonte",
			content: "[[Alvo]]",
		});

		const manual = await api.notes.addLink({
			sourceNoteId: source.id,
			targetNoteId: target.id,
			reason: "Mesmo conceito",
		});
		expect(manual?.linkType).toBe("manual");

		await expect(
			api.notes.addLink({
				sourceNoteId: source.id,
				targetNoteId: target.id,
				reason: "De novo",
				linkType: "ai_suggested",
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });

		const detail = await api.notes.getById({ id: source.id });
		expect(detail.outboundLinks.map((l) => l.linkType).sort()).toEqual([
			"manual",
			"wikilink",
		]);

		const [summary] = (await api.notes.list()).filter(
			(n) => n.id === source.id,
		);
		expect(summary?.linkCount).toBe(1);
	});

	it("não remove vínculo de wikilink pela API", async () => {
		await api.notes.create({ title: "Alvo" });
		const source = await api.notes.create({
			title: "Fonte",
			content: "[[Alvo]]",
		});
		const [link] = (await api.notes.getById({ id: source.id })).outboundLinks;
		await expect(
			api.notes.removeLink({ id: link?.id as string }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});

	it("valida justificativa e auto-vínculo", async () => {
		const a = await api.notes.create({ title: "A" });
		const b = await api.notes.create({ title: "B" });
		await expect(
			api.notes.addLink({
				sourceNoteId: a.id,
				targetNoteId: b.id,
				reason: "x",
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			api.notes.addLink({
				sourceNoteId: a.id,
				targetNoteId: a.id,
				reason: "mesma",
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("sugere notas com tags em comum, ignorando as que estão na lixeira", async () => {
		const a = await api.notes.create({
			title: "Factory",
			tags: ["design-patterns"],
		});
		const b = await api.notes.create({
			title: "Strategy",
			tags: ["design-patterns"],
		});
		const c = await api.notes.create({
			title: "Observer",
			tags: ["design-patterns"],
		});
		await api.notes.delete({ id: c.id });

		const suggestions = await api.notes.suggestLinks({ noteId: a.id });
		expect(suggestions.map((s) => s.targetNoteId)).toEqual([b.id]);
		expect(suggestions[0]?.reason).toContain("design-patterns");
	});
});

describe("salvamento", () => {
	it("recusa com CONFLICT quando a nota mudou depois da versão que o app tinha", async () => {
		const note = await api.notes.create({ title: "Nota", content: "v1" });
		const firstSave = await api.notes.update({
			id: note.id,
			content: "v2",
			expectedUpdatedAt: new Date(note.updatedAt).toISOString(),
		});
		expect(firstSave.content).toBe("v2");

		await expect(
			api.notes.update({
				id: note.id,
				content: "v3 de outro aparelho",
				expectedUpdatedAt: new Date(
					new Date(firstSave.updatedAt).getTime() - 60_000,
				).toISOString(),
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });

		// "Manter minha versão": salva sem a data esperada.
		await expect(
			api.notes.update({ id: note.id, content: "v3" }),
		).resolves.toMatchObject({
			content: "v3",
		});
	});

	it("recusa conteúdo acima do limite", async () => {
		await expect(
			api.notes.create({ title: "Grande", content: "a".repeat(200_001) }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});
});

describe("organização", () => {
	it("move entre pastas e reordena renumerando os irmãos", async () => {
		const folder = await api.folders.create({ name: "Aulas" });
		const a = await api.notes.create({ title: "A" });
		const b = await api.notes.create({ title: "B" });
		const c = await api.notes.create({ title: "C" });

		const rootOrder = async () =>
			(await api.notes.list({ folderId: null })).map((n) => n.title);
		expect(await rootOrder()).toEqual(["A", "B", "C"]);

		await api.notes.reorder({ folderId: null, orderedIds: [c.id, a.id] });
		expect(await rootOrder()).toEqual(["C", "A", "B"]);

		await api.notes.move({ id: a.id, folderId: folder.id });
		expect(await rootOrder()).toEqual(["C", "B"]);
		expect(
			(await api.notes.list({ folderId: folder.id })).map((n) => n.title),
		).toEqual(["A"]);

		await api.notes.move({ id: b.id, folderId: folder.id, position: 0 });
		expect(
			(await api.notes.list({ folderId: folder.id })).map((n) => n.title),
		).toEqual(["B", "A"]);
		const positions = (await api.notes.list({ folderId: folder.id })).map(
			(n) => n.position,
		);
		expect(positions).toEqual([0, 1]);
	});

	it("não move para pasta na lixeira", async () => {
		const folder = await api.folders.create({ name: "Velha" });
		const note = await api.notes.create({ title: "Nota" });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });
		await expect(
			api.notes.move({ id: note.id, folderId: folder.id }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	it("busca por título ou conteúdo e ignora a lixeira", async () => {
		await api.notes.create({ title: "Normalização", content: "3FN" });
		await api.notes.create({
			title: "Índices",
			content: "B-Tree e 50% de ganho",
		});
		const trashed = await api.notes.create({ title: "Normalização antiga" });
		await api.notes.delete({ id: trashed.id });

		expect(
			(await api.notes.list({ search: "normaliz" })).map((n) => n.title),
		).toEqual(["Normalização"]);
		// `%` é texto, não curinga.
		expect(
			(await api.notes.list({ search: "50%" })).map((n) => n.title),
		).toEqual(["Índices"]);
	});
});
