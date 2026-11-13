import { randomUUID } from "node:crypto";
import { nameForRestore, TRASH_RETENTION_DAYS } from "@busuucsal-v3/notes";
import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import {
	type Folder,
	folders,
	type Note,
	notes,
} from "../../db/schema/index.js";
import { type Executor, notFound } from "./db.js";
import {
	listActiveFolders,
	siblingFolderNames,
	subtreeIds,
} from "./folders.service.js";
import {
	activeNoteTitles,
	resyncNotesMentioning,
	syncWikilinks,
} from "./notes.service.js";
import { nextPosition } from "./ordering.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrashItemType = "note" | "folder";

export type TrashItem = {
	id: string;
	type: TrashItemType;
	name: string;
	deletedAt: Date;
	daysLeft: number;
	/** Pastas: quantos itens saíram junto com ela (pastas e notas de dentro). */
	itemCount: number;
};

export function daysLeft(deletedAt: Date, now: Date): number {
	const elapsed = now.getTime() - deletedAt.getTime();
	return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed / DAY_MS));
}

/** Envia uma nota para a lixeira (sozinha, num lote próprio). */
export async function trashNote(db: Executor, noteId: string): Promise<void> {
	await db
		.update(notes)
		.set({ deletedAt: new Date(), deleteBatch: randomUUID() })
		.where(eq(notes.id, noteId));
}

/** Envia a pasta e tudo que está ativo dentro dela para a lixeira, no mesmo lote. */
export async function trashFolderTree(
	db: Executor,
	userId: string,
	folderId: string,
): Promise<{ folderIds: string[]; noteIds: string[] }> {
	const active = await listActiveFolders(db, userId);
	const folderIds = subtreeIds(folderId, active);
	const batch = randomUUID();
	const deletedAt = new Date();

	await db
		.update(folders)
		.set({ deletedAt, deleteBatch: batch })
		.where(and(inArray(folders.id, folderIds), isNull(folders.deletedAt)));
	const trashedNotes = await db
		.update(notes)
		.set({ deletedAt, deleteBatch: batch })
		.where(
			and(
				eq(notes.userId, userId),
				inArray(notes.folderId, folderIds),
				isNull(notes.deletedAt),
			),
		)
		.returning({ id: notes.id });

	return { folderIds, noteIds: trashedNotes.map((note) => note.id) };
}

async function trashedFolders(db: Executor, userId: string): Promise<Folder[]> {
	return db
		.select()
		.from(folders)
		.where(and(eq(folders.userId, userId), isNotNull(folders.deletedAt)));
}

async function trashedNotes(db: Executor, userId: string): Promise<Note[]> {
	return db
		.select()
		.from(notes)
		.where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt)));
}

/**
 * Itens da lixeira. Uma pasta excluída aparece como um item só: o que saiu
 * junto com ela (mesmo lote) fica escondido e volta quando ela é restaurada.
 */
export async function listTrash(
	db: Executor,
	userId: string,
	now = new Date(),
): Promise<TrashItem[]> {
	const [trashFolders, trashNotes] = await Promise.all([
		trashedFolders(db, userId),
		trashedNotes(db, userId),
	]);
	const batchOf = new Map(
		trashFolders.map((folder) => [folder.id, folder.deleteBatch]),
	);
	const insideTrashedParent = (parentId: string | null, batch: string | null) =>
		parentId !== null && batch !== null && batchOf.get(parentId) === batch;

	const batchSize = new Map<string, number>();
	for (const item of [...trashFolders, ...trashNotes]) {
		if (!item.deleteBatch) continue;
		batchSize.set(item.deleteBatch, (batchSize.get(item.deleteBatch) ?? 0) + 1);
	}

	const items: TrashItem[] = [];
	for (const folder of trashFolders) {
		if (insideTrashedParent(folder.parentId, folder.deleteBatch)) continue;
		const deletedAt = folder.deletedAt as Date;
		items.push({
			id: folder.id,
			type: "folder",
			name: folder.name,
			deletedAt,
			daysLeft: daysLeft(deletedAt, now),
			itemCount: folder.deleteBatch
				? (batchSize.get(folder.deleteBatch) ?? 1) - 1
				: 0,
		});
	}
	for (const note of trashNotes) {
		if (insideTrashedParent(note.folderId, note.deleteBatch)) continue;
		const deletedAt = note.deletedAt as Date;
		items.push({
			id: note.id,
			type: "note",
			name: note.title,
			deletedAt,
			daysLeft: daysLeft(deletedAt, now),
			itemCount: 0,
		});
	}
	return items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
}

async function requireTrashedNote(
	db: Executor,
	userId: string,
	noteId: string,
): Promise<Note> {
	const [note] = await db
		.select()
		.from(notes)
		.where(
			and(
				eq(notes.id, noteId),
				eq(notes.userId, userId),
				isNotNull(notes.deletedAt),
			),
		);
	if (!note) throw notFound("Nota não encontrada na lixeira");
	return note;
}

async function requireTrashedFolder(
	db: Executor,
	userId: string,
	folderId: string,
): Promise<Folder> {
	const [folder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.userId, userId),
				isNotNull(folders.deletedAt),
			),
		);
	if (!folder) throw notFound("Pasta não encontrada na lixeira");
	return folder;
}

type RestoreDestination = {
	folderId: string | null;
	/** A pasta volta junto (mesmo lote): a nota mantém a posição que tinha nela. */
	keepPosition: boolean;
};

/** Restaura notas: título com sufixo se estiver em uso, e links re-sincronizados nos dois sentidos. */
async function restoreNotes(
	db: Executor,
	userId: string,
	toRestore: Note[],
	destinationOf: (note: Note) => RestoreDestination,
): Promise<Array<{ id: string; title: string }>> {
	const takenTitles = (await activeNoteTitles(db, userId)).map(
		(note) => note.title,
	);
	const restored: Array<{ id: string; title: string }> = [];
	const nextByFolder = new Map<string | null, number>();

	for (const note of toRestore) {
		const title = nameForRestore(note.title, takenTitles);
		takenTitles.push(title);
		const { folderId, keepPosition } = destinationOf(note);
		let position = note.position;
		if (!keepPosition) {
			position =
				nextByFolder.get(folderId) ??
				(await nextPosition(db, "note", userId, folderId));
			nextByFolder.set(folderId, position + 1);
		}

		await db
			.update(notes)
			.set({
				title,
				folderId,
				position,
				deletedAt: null,
				deleteBatch: null,
				updatedAt: new Date(),
			})
			.where(eq(notes.id, note.id));
		restored.push({ id: note.id, title });
	}

	for (const note of toRestore) {
		await syncWikilinks(db, userId, note.id, note.content);
	}
	for (const { id, title } of restored) {
		await resyncNotesMentioning(db, userId, title, id);
	}
	return restored;
}

export async function restoreNote(
	db: Executor,
	userId: string,
	noteId: string,
): Promise<{ id: string; name: string; folderId: string | null }> {
	const note = await requireTrashedNote(db, userId, noteId);
	const activeFolderIds = new Set(
		(await listActiveFolders(db, userId)).map((folder) => folder.id),
	);
	const folderId =
		note.folderId && activeFolderIds.has(note.folderId) ? note.folderId : null;
	const [restored] = await restoreNotes(db, userId, [note], () => ({
		folderId,
		keepPosition: false,
	}));
	return { id: note.id, name: restored?.title ?? note.title, folderId };
}

/** Restaura a pasta e tudo que saiu junto com ela (mesmo lote). */
export async function restoreFolder(
	db: Executor,
	userId: string,
	folderId: string,
): Promise<{ id: string; name: string; parentId: string | null }> {
	const root = await requireTrashedFolder(db, userId, folderId);
	const active = await listActiveFolders(db, userId);
	const activeIds = new Set(active.map((folder) => folder.id));

	const batchFolders = root.deleteBatch
		? (await trashedFolders(db, userId)).filter(
				(folder) => folder.deleteBatch === root.deleteBatch,
			)
		: [root];
	const batchFolderIds = new Set(batchFolders.map((folder) => folder.id));
	const batchNotes = root.deleteBatch
		? (await trashedNotes(db, userId)).filter(
				(note) => note.deleteBatch === root.deleteBatch,
			)
		: [];

	const parentId =
		root.parentId && activeIds.has(root.parentId) ? root.parentId : null;
	const name = nameForRestore(
		root.name,
		siblingFolderNames(parentId, active),
		"restaurada",
	);
	const position = await nextPosition(db, "folder", userId, parentId);
	const now = new Date();

	await db
		.update(folders)
		.set({
			parentId,
			name,
			position,
			deletedAt: null,
			deleteBatch: null,
			updatedAt: now,
		})
		.where(eq(folders.id, root.id));
	const others = batchFolders
		.filter((folder) => folder.id !== root.id)
		.map((folder) => folder.id);
	if (others.length > 0) {
		await db
			.update(folders)
			.set({ deletedAt: null, deleteBatch: null, updatedAt: now })
			.where(inArray(folders.id, others));
	}

	await restoreNotes(db, userId, batchNotes, (note) => {
		if (note.folderId && batchFolderIds.has(note.folderId)) {
			return { folderId: note.folderId, keepPosition: true };
		}
		const folderId =
			note.folderId && activeIds.has(note.folderId) ? note.folderId : null;
		return { folderId, keepPosition: false };
	});

	return { id: root.id, name, parentId };
}

export async function deleteNotePermanently(
	db: Executor,
	userId: string,
	noteId: string,
): Promise<void> {
	await requireTrashedNote(db, userId, noteId);
	await db.delete(notes).where(eq(notes.id, noteId));
}

/** Exclui de vez a pasta e o que saiu junto com ela. Itens de outros lotes vão para a raiz da lixeira. */
export async function deleteFolderPermanently(
	db: Executor,
	userId: string,
	folderId: string,
): Promise<void> {
	const root = await requireTrashedFolder(db, userId, folderId);
	if (root.deleteBatch) {
		await db
			.delete(notes)
			.where(
				and(eq(notes.userId, userId), eq(notes.deleteBatch, root.deleteBatch)),
			);
		await db
			.delete(folders)
			.where(
				and(
					eq(folders.userId, userId),
					eq(folders.deleteBatch, root.deleteBatch),
				),
			);
	} else {
		await db.delete(folders).where(eq(folders.id, root.id));
	}
}

export async function emptyTrash(db: Executor, userId: string): Promise<void> {
	await db
		.delete(notes)
		.where(and(eq(notes.userId, userId), isNotNull(notes.deletedAt)));
	await db
		.delete(folders)
		.where(and(eq(folders.userId, userId), isNotNull(folders.deletedAt)));
}

/** Remove de vez o que está na lixeira há mais de 30 dias (de todos os alunos). */
export async function purgeExpiredTrash(
	db: Executor,
	now = new Date(),
): Promise<{ notes: number; folders: number }> {
	const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * DAY_MS);
	const purgedNotes = await db
		.delete(notes)
		.where(and(isNotNull(notes.deletedAt), lt(notes.deletedAt, cutoff)))
		.returning({ id: notes.id });
	const purgedFolders = await db
		.delete(folders)
		.where(and(isNotNull(folders.deletedAt), lt(folders.deletedAt, cutoff)))
		.returning({ id: folders.id });
	return { notes: purgedNotes.length, folders: purgedFolders.length };
}
