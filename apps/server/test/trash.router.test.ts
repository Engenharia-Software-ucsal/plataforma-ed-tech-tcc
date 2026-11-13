import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { folders, notes, type User } from "../src/db/schema/index.js";
import {
	daysLeft,
	purgeExpiredTrash,
} from "../src/services/notes/trash.service.js";
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

async function setDeletedAt(
	table: "notes" | "folders",
	id: string,
	deletedAt: Date,
) {
	if (table === "notes") {
		await testDb.db.update(notes).set({ deletedAt }).where(eq(notes.id, id));
	} else {
		await testDb.db
			.update(folders)
			.set({ deletedAt })
			.where(eq(folders.id, id));
	}
}

describe("listar", () => {
	it("mostra a pasta como um item só, com quantos itens saíram junto", async () => {
		const folder = await api.folders.create({ name: "Pasta" });
		await api.notes.create({ title: "Dentro", folderId: folder.id });
		const loose = await api.notes.create({ title: "Solta" });
		await api.notes.delete({ id: loose.id });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });

		const items = await api.trash.list();
		expect(items.map((i) => [i.type, i.name, i.itemCount])).toEqual([
			["folder", "Pasta", 1],
			["note", "Solta", 0],
		]);
		expect(items[0]?.daysLeft).toBe(30);
	});

	it("calcula os dias restantes", () => {
		const now = new Date("2026-11-30T12:00:00Z");
		expect(daysLeft(new Date("2026-11-30T11:00:00Z"), now)).toBe(30);
		expect(daysLeft(new Date("2026-11-01T12:00:00Z"), now)).toBe(1);
		expect(daysLeft(new Date("2026-10-01T12:00:00Z"), now)).toBe(0);
	});
});

describe("restaurar", () => {
	it("restaura a pasta com o que saiu junto, mas não o que já estava na lixeira antes", async () => {
		const folder = await api.folders.create({ name: "Pasta" });
		const sub = await api.folders.create({ name: "Sub", parentId: folder.id });
		const withIt = await api.notes.create({ title: "Junto", folderId: sub.id });
		const before = await api.notes.create({
			title: "Antes",
			folderId: folder.id,
		});
		await api.notes.delete({ id: before.id });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });

		await api.trash.restore({ id: folder.id, type: "folder" });

		const tree = await api.folders.tree();
		expect(tree.folders.map((f) => f.name).sort()).toEqual(["Pasta", "Sub"]);
		expect(tree.notes.map((n) => [n.id, n.folderId])).toEqual([
			[withIt.id, sub.id],
		]);
		const trash = await api.trash.list();
		expect(trash.map((i) => i.id)).toEqual([before.id]);
	});

	it("restaura nota cuja pasta está na lixeira para a raiz", async () => {
		const folder = await api.folders.create({ name: "Pasta" });
		const note = await api.notes.create({ title: "Nota", folderId: folder.id });
		await api.notes.delete({ id: note.id });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });

		const restored = await api.trash.restore({ id: note.id, type: "note" });
		expect(restored).toMatchObject({ name: "Nota", parentId: null });
		expect(
			(await api.folders.tree()).notes.map((n) => [n.id, n.folderId]),
		).toEqual([[note.id, null]]);
	});

	it("volta para a pasta original quando ela ainda existe", async () => {
		const folder = await api.folders.create({ name: "Pasta" });
		const note = await api.notes.create({ title: "Nota", folderId: folder.id });
		await api.notes.delete({ id: note.id });
		await api.trash.restore({ id: note.id, type: "note" });
		expect(
			(await api.notes.list({ folderId: folder.id })).map((n) => n.id),
		).toEqual([note.id]);
	});

	it("aplica sufixo quando o nome já está em uso", async () => {
		const note = await api.notes.create({ title: "SOLID" });
		await api.notes.delete({ id: note.id });
		await api.notes.create({ title: "solid" });

		await expect(
			api.trash.restore({ id: note.id, type: "note" }),
		).resolves.toMatchObject({
			name: "SOLID (restaurada)",
		});

		const folder = await api.folders.create({ name: "Provas" });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });
		await api.folders.create({ name: "Provas" });
		await expect(
			api.trash.restore({ id: folder.id, type: "folder" }),
		).resolves.toMatchObject({
			name: "Provas (restaurada)",
		});
	});

	it("não restaura itens de outro aluno nem itens ativos", async () => {
		const note = await api.notes.create({ title: "Nota" });
		await expect(
			api.trash.restore({ id: note.id, type: "note" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await api.notes.delete({ id: note.id });
		await expect(
			bobApi.trash.restore({ id: note.id, type: "note" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(
			bobApi.trash.deletePermanently({ id: note.id, type: "note" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(await bobApi.trash.list()).toEqual([]);
	});
});

describe("excluir definitivamente", () => {
	it("exclui a pasta e o que saiu junto; itens de outros lotes ficam na lixeira", async () => {
		const folder = await api.folders.create({ name: "Pasta" });
		const before = await api.notes.create({
			title: "Antes",
			folderId: folder.id,
		});
		await api.notes.create({ title: "Junto", folderId: folder.id });
		await api.notes.delete({ id: before.id });
		await api.folders.delete({ id: folder.id, mode: "trashAll" });

		await api.trash.deletePermanently({ id: folder.id, type: "folder" });

		const trash = await api.trash.list();
		expect(trash.map((i) => [i.id, i.name])).toEqual([[before.id, "Antes"]]);
		// "Junto" foi de vez: o título está livre.
		await expect(api.notes.create({ title: "Junto" })).resolves.toBeTruthy();
	});

	it("esvazia a lixeira só do próprio aluno", async () => {
		const mine = await api.notes.create({ title: "Minha" });
		const theirs = await bobApi.notes.create({ title: "Dele" });
		await api.notes.delete({ id: mine.id });
		await bobApi.notes.delete({ id: theirs.id });

		await api.trash.empty();
		expect(await api.trash.list()).toEqual([]);
		expect((await bobApi.trash.list()).map((i) => i.id)).toEqual([theirs.id]);
	});
});

describe("expurgo de 30 dias", () => {
	it("remove só o que está na lixeira há mais de 30 dias", async () => {
		const now = new Date("2026-12-31T12:00:00Z");
		const old = await api.notes.create({ title: "Velha" });
		const recent = await api.notes.create({ title: "Recente" });
		const active = await api.notes.create({ title: "Ativa" });
		const oldFolder = await api.folders.create({ name: "Pasta velha" });
		await api.notes.delete({ id: old.id });
		await api.notes.delete({ id: recent.id });
		await api.folders.delete({ id: oldFolder.id, mode: "trashAll" });
		await setDeletedAt("notes", old.id, new Date("2026-11-30T11:00:00Z"));
		await setDeletedAt("notes", recent.id, new Date("2026-12-02T12:00:00Z"));
		await setDeletedAt(
			"folders",
			oldFolder.id,
			new Date("2026-11-01T12:00:00Z"),
		);

		const purged = await purgeExpiredTrash(testDb.db, now);
		expect(purged).toEqual({ notes: 1, folders: 1 });

		const remaining = await testDb.db.select({ id: notes.id }).from(notes);
		expect(remaining.map((n) => n.id).sort()).toEqual(
			[recent.id, active.id].sort(),
		);
	});
});
