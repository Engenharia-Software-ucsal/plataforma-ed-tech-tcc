import { and, asc, eq, isNull } from "drizzle-orm";
import { folders, notes } from "../../db/schema/index.js";
import { type Executor, parentIs } from "./db.js";

/**
 * Ordem das notas e das pastas dentro de uma pasta. Notas e pastas são duas
 * listas separadas (as pastas aparecem antes). A posição é um inteiro, e cada
 * movimentação renumera os irmãos: os grupos são pequenos, então isso é mais
 * simples que índices fracionários.
 */
export type SiblingKind = "note" | "folder";

type Sibling = { id: string; position: number };

async function activeSiblings(
	db: Executor,
	kind: SiblingKind,
	userId: string,
	parentId: string | null,
): Promise<Sibling[]> {
	if (kind === "note") {
		return db
			.select({ id: notes.id, position: notes.position })
			.from(notes)
			.where(
				and(
					eq(notes.userId, userId),
					parentIs(notes.folderId, parentId),
					isNull(notes.deletedAt),
				),
			)
			.orderBy(asc(notes.position), asc(notes.title));
	}
	return db
		.select({ id: folders.id, position: folders.position })
		.from(folders)
		.where(
			and(
				eq(folders.userId, userId),
				parentIs(folders.parentId, parentId),
				isNull(folders.deletedAt),
			),
		)
		.orderBy(asc(folders.position), asc(folders.name));
}

async function setPosition(
	db: Executor,
	kind: SiblingKind,
	id: string,
	position: number,
) {
	if (kind === "note") {
		await db.update(notes).set({ position }).where(eq(notes.id, id));
	} else {
		await db.update(folders).set({ position }).where(eq(folders.id, id));
	}
}

/** Próxima posição livre no fim da pasta. */
export async function nextPosition(
	db: Executor,
	kind: SiblingKind,
	userId: string,
	parentId: string | null,
): Promise<number> {
	const siblings = await activeSiblings(db, kind, userId, parentId);
	return siblings.reduce(
		(max, sibling) => Math.max(max, sibling.position + 1),
		0,
	);
}

/** Ordem final: os ids pedidos primeiro (os que são irmãos), depois os demais na ordem atual. */
export function mergeOrder(
	currentIds: string[],
	requestedIds: string[],
): string[] {
	const current = new Set(currentIds);
	const head = requestedIds.filter(
		(id, index) => current.has(id) && requestedIds.indexOf(id) === index,
	);
	const headSet = new Set(head);
	return [...head, ...currentIds.filter((id) => !headSet.has(id))];
}

/** Coloca `itemId` na posição `index` (0 = primeiro) entre os irmãos. */
export function insertAt(
	currentIds: string[],
	itemId: string,
	index?: number,
): string[] {
	const without = currentIds.filter((id) => id !== itemId);
	const at =
		index === undefined
			? without.length
			: Math.max(0, Math.min(index, without.length));
	return [...without.slice(0, at), itemId, ...without.slice(at)];
}

/** Grava as posições 0..n-1 na ordem dada, só onde mudou. */
async function applyOrder(
	db: Executor,
	kind: SiblingKind,
	siblings: Sibling[],
	order: string[],
) {
	const positions = new Map(
		siblings.map((sibling) => [sibling.id, sibling.position]),
	);
	for (const [index, id] of order.entries()) {
		if (positions.get(id) !== index) {
			await setPosition(db, kind, id, index);
		}
	}
}

/** Reordena os irmãos de uma pasta. Ids que não são irmãos são ignorados. */
export async function reorderSiblings(
	db: Executor,
	kind: SiblingKind,
	userId: string,
	parentId: string | null,
	requestedIds: string[],
): Promise<string[]> {
	const siblings = await activeSiblings(db, kind, userId, parentId);
	const order = mergeOrder(
		siblings.map((sibling) => sibling.id),
		requestedIds,
	);
	await applyOrder(db, kind, siblings, order);
	return order;
}

/**
 * Renumera a pasta colocando `itemId` (que já deve ter o pai novo gravado) na
 * posição pedida, ou no fim.
 */
export async function placeItem(
	db: Executor,
	kind: SiblingKind,
	userId: string,
	parentId: string | null,
	itemId: string,
	index?: number,
): Promise<void> {
	const siblings = await activeSiblings(db, kind, userId, parentId);
	const order = insertAt(
		siblings.map((sibling) => sibling.id),
		itemId,
		index,
	);
	await applyOrder(db, kind, siblings, order);
}

/** Fecha buracos deixados por um item que saiu da pasta. */
export async function compactSiblings(
	db: Executor,
	kind: SiblingKind,
	userId: string,
	parentId: string | null,
): Promise<void> {
	const siblings = await activeSiblings(db, kind, userId, parentId);
	await applyOrder(
		db,
		kind,
		siblings,
		siblings.map((sibling) => sibling.id),
	);
}
