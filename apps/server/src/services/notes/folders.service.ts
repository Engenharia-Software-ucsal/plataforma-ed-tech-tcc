import { FOLDER_MAX_DEPTH, titleKey } from "@busuucsal-v3/notes";
import { and, eq, isNull } from "drizzle-orm";
import { type Folder, folders } from "../../db/schema/index.js";
import { badRequest, conflict, type Executor, notFound } from "./db.js";

export async function listActiveFolders(
	db: Executor,
	userId: string,
): Promise<Folder[]> {
	return db
		.select()
		.from(folders)
		.where(and(eq(folders.userId, userId), isNull(folders.deletedAt)));
}

/** Pasta ativa do aluno; erro se não existir, for de outro aluno ou estiver na lixeira. */
export async function requireActiveFolder(
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
				isNull(folders.deletedAt),
			),
		);
	if (!folder) throw notFound("Pasta não encontrada");
	return folder;
}

/** Valida o destino de uma nota/pasta: nulo (raiz) ou uma pasta ativa do aluno. */
export async function requireDestination(
	db: Executor,
	userId: string,
	folderId: string | null | undefined,
): Promise<string | null> {
	if (!folderId) return null;
	await requireActiveFolder(db, userId, folderId);
	return folderId;
}

type TreeNode = Pick<Folder, "id" | "parentId">;

/** Profundidade de uma pasta: uma pasta na raiz tem 1. A raiz (null) tem 0. */
export function depthOf(
	folderId: string | null,
	byId: Map<string, TreeNode>,
): number {
	let depth = 0;
	let current = folderId;
	const seen = new Set<string>();
	while (current !== null) {
		if (seen.has(current)) break;
		seen.add(current);
		depth++;
		current = byId.get(current)?.parentId ?? null;
	}
	return depth;
}

/** Ids da pasta e de todas as descendentes. */
export function subtreeIds(rootId: string, all: TreeNode[]): string[] {
	const children = new Map<string, string[]>();
	for (const folder of all) {
		if (!folder.parentId) continue;
		const list = children.get(folder.parentId) ?? [];
		list.push(folder.id);
		children.set(folder.parentId, list);
	}
	const result: string[] = [];
	const stack = [rootId];
	while (stack.length > 0) {
		const id = stack.pop() as string;
		if (result.includes(id)) continue;
		result.push(id);
		stack.push(...(children.get(id) ?? []));
	}
	return result;
}

/** Quantos níveis a subárvore ocupa (uma pasta sem filhas ocupa 1). */
export function subtreeHeight(rootId: string, all: TreeNode[]): number {
	const byId = new Map(all.map((folder) => [folder.id, folder]));
	const rootDepth = depthOf(rootId, byId);
	return subtreeIds(rootId, all).reduce(
		(height, id) => Math.max(height, depthOf(id, byId) - rootDepth + 1),
		1,
	);
}

/** Confere se uma pasta com `height` níveis cabe dentro de `parentId`. */
export function assertDepthFits(
	parentId: string | null,
	height: number,
	byId: Map<string, TreeNode>,
): void {
	if (depthOf(parentId, byId) + height > FOLDER_MAX_DEPTH) {
		throw badRequest(
			`As pastas podem ter no máximo ${FOLDER_MAX_DEPTH} níveis.`,
		);
	}
}

/** Erro se já houver uma pasta ativa irmã com o mesmo nome (sem diferenciar caixa). */
export function assertFolderNameFree(
	name: string,
	parentId: string | null,
	all: Folder[],
	exceptId?: string,
): void {
	const key = titleKey(name);
	const clash = all.some(
		(folder) =>
			folder.id !== exceptId &&
			(folder.parentId ?? null) === parentId &&
			titleKey(folder.name) === key,
	);
	if (clash) throw conflict(`Já existe uma pasta chamada "${name}" aqui.`);
}

export function siblingFolderNames(
	parentId: string | null,
	all: Folder[],
	exceptId?: string,
): string[] {
	return all
		.filter(
			(folder) =>
				folder.id !== exceptId && (folder.parentId ?? null) === parentId,
		)
		.map((folder) => folder.name);
}
