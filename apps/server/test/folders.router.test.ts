import { FOLDER_MAX_DEPTH } from "@busuucsal-v3/notes";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { User } from "../src/db/schema/index.js";
import {
	callerFor,
	createTestDatabase,
	createUser,
	type TestDatabase,
} from "./helpers/pglite-db.js";

let testDb: TestDatabase;
let alice: User;
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
	api = callerFor(testDb.db, alice);
	bobApi = callerFor(testDb.db, await createUser(testDb.db, "Bob"));
});

async function childrenNames(parentId: string | null) {
	const tree = await api.folders.tree();
	return tree.folders.filter((f) => f.parentId === parentId).map((f) => f.name);
}

describe("criar e renomear", () => {
	it("cria pastas aninhadas e devolve a árvore com as notas", async () => {
		const aulas = await api.folders.create({ name: "Aulas" });
		const bd = await api.folders.create({ name: "BD", parentId: aulas.id });
		const note = await api.notes.create({
			title: "3FN",
			content: "# Normalização",
			folderId: bd.id,
		});

		const tree = await api.folders.tree();
		expect(tree.folders.map((f) => [f.name, f.parentId])).toEqual([
			["Aulas", null],
			["BD", aulas.id],
		]);
		expect(tree.notes).toEqual([
			expect.objectContaining({
				id: note.id,
				folderId: bd.id,
				preview: "Normalização",
			}),
		]);
	});

	it("não repete nome entre irmãs (sem diferenciar caixa), mas aceita em pastas diferentes", async () => {
		const a = await api.folders.create({ name: "Provas" });
		await expect(api.folders.create({ name: "provas" })).rejects.toMatchObject({
			code: "CONFLICT",
		});
		await expect(
			api.folders.create({ name: "Provas", parentId: a.id }),
		).resolves.toBeTruthy();

		const b = await api.folders.create({ name: "Listas" });
		await expect(
			api.folders.rename({ id: b.id, name: "PROVAS" }),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
		await expect(
			api.folders.rename({ id: b.id, name: "Exercícios" }),
		).resolves.toMatchObject({
			name: "Exercícios",
		});
	});

	it("rejeita nome vazio", async () => {
		await expect(api.folders.create({ name: "   " })).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});

	it(`limita a ${FOLDER_MAX_DEPTH} níveis`, async () => {
		let parentId: string | null = null;
		for (let level = 1; level <= FOLDER_MAX_DEPTH; level++) {
			parentId = (await api.folders.create({ name: `N${level}`, parentId })).id;
		}
		await expect(
			api.folders.create({ name: "Funda demais", parentId }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});

	it("não mexe nas pastas de outro aluno", async () => {
		const folder = await api.folders.create({ name: "Minha" });
		await expect(
			bobApi.folders.rename({ id: folder.id, name: "X" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.folders.delete({ id: folder.id, mode: "trashAll" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.folders.create({ name: "X", parentId: folder.id }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		expect((await bobApi.folders.tree()).folders).toEqual([]);
	});
});

describe("mover e reordenar", () => {
	it("não deixa mover uma pasta para dentro dela mesma ou de uma descendente", async () => {
		const a = await api.folders.create({ name: "A" });
		const b = await api.folders.create({ name: "B", parentId: a.id });
		await expect(
			api.folders.move({ id: a.id, parentId: a.id }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
		await expect(
			api.folders.move({ id: a.id, parentId: b.id }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});

	it("respeita o limite de níveis contando a subárvore que vai junto", async () => {
		let deep: string | null = null;
		for (let level = 1; level < FOLDER_MAX_DEPTH; level++) {
			deep = (await api.folders.create({ name: `N${level}`, parentId: deep }))
				.id;
		}
		const tree = await api.folders.create({ name: "Galho" });
		await api.folders.create({ name: "Folha", parentId: tree.id });
		// N7 + Galho/Folha = 9 níveis.
		await expect(
			api.folders.move({ id: tree.id, parentId: deep }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
		});
	});

	it("move com as filhas e recusa nome repetido no destino", async () => {
		const a = await api.folders.create({ name: "A" });
		const b = await api.folders.create({ name: "B" });
		const child = await api.folders.create({ name: "Filha", parentId: a.id });
		await api.folders.create({ name: "Neta", parentId: child.id });

		await api.folders.move({ id: child.id, parentId: b.id });
		expect(await childrenNames(b.id)).toEqual(["Filha"]);
		expect(await childrenNames(child.id)).toEqual(["Neta"]);

		await api.folders.create({ name: "filha", parentId: a.id });
		await expect(
			api.folders.move({ id: child.id, parentId: a.id }),
		).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("reordena as pastas irmãs", async () => {
		const a = await api.folders.create({ name: "A" });
		await api.folders.create({ name: "B" });
		const c = await api.folders.create({ name: "C" });
		await api.folders.reorder({ parentId: null, orderedIds: [c.id, a.id] });
		expect(await childrenNames(null)).toEqual(["C", "A", "B"]);
	});
});

describe("excluir", () => {
	it("moveToParent: o conteúdo sobe para a pasta-pai e só a pasta vai para a lixeira", async () => {
		const parent = await api.folders.create({ name: "Pai" });
		const folder = await api.folders.create({
			name: "Excluir",
			parentId: parent.id,
		});
		await api.folders.create({ name: "Listas", parentId: parent.id });
		const childFolder = await api.folders.create({
			name: "Listas",
			parentId: folder.id,
		});
		const note = await api.notes.create({
			title: "Dentro",
			folderId: folder.id,
		});

		await api.folders.delete({ id: folder.id, mode: "moveToParent" });

		const tree = await api.folders.tree();
		expect(tree.folders.find((f) => f.id === folder.id)).toBeUndefined();
		// A pasta que subiu tinha o mesmo nome de uma irmã: ganha " 2".
		expect(tree.folders.find((f) => f.id === childFolder.id)).toMatchObject({
			parentId: parent.id,
			name: "Listas 2",
		});
		expect(tree.notes.find((n) => n.id === note.id)?.folderId).toBe(parent.id);

		const trash = await api.trash.list();
		expect(trash).toEqual([
			expect.objectContaining({ id: folder.id, type: "folder", itemCount: 0 }),
		]);
	});

	it("trashAll: a pasta e tudo dentro vão para a lixeira e somem da árvore", async () => {
		const folder = await api.folders.create({ name: "Semestre 1" });
		const sub = await api.folders.create({ name: "BD", parentId: folder.id });
		await api.notes.create({ title: "N1", folderId: folder.id });
		await api.notes.create({ title: "N2", folderId: sub.id });
		const outside = await api.notes.create({ title: "Fora" });

		await api.folders.delete({ id: folder.id, mode: "trashAll" });

		const tree = await api.folders.tree();
		expect(tree.folders).toEqual([]);
		expect(tree.notes.map((n) => n.id)).toEqual([outside.id]);
		const trash = await api.trash.list();
		expect(trash).toEqual([
			expect.objectContaining({
				id: folder.id,
				type: "folder",
				name: "Semestre 1",
				itemCount: 3,
			}),
		]);
	});
});
