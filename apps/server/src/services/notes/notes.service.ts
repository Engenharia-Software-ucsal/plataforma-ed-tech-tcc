import {
	autoTagsForSubject,
	extractWikilinkTargets,
	markdownPreview,
	mentionsTitle,
	rewriteWikilinkTargets,
	titleKey,
} from "@busuucsal-v3/notes";
import { and, asc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import {
	classSessions,
	type Note,
	noteLinks,
	notes,
} from "../../db/schema/index.js";
import {
	badRequest,
	conflict,
	type Executor,
	escapeLike,
	notFound,
} from "./db.js";

export type NoteSummary = {
	id: string;
	title: string;
	folderId: string | null;
	position: number;
	tags: string[];
	autoTags: string[];
	classSessionId: string | null;
	preview: string;
	linkCount: number;
	createdAt: Date;
	updatedAt: Date;
};

export function toSummary(note: Note, linkCount = 0): NoteSummary {
	return {
		id: note.id,
		title: note.title,
		folderId: note.folderId,
		position: note.position,
		tags: note.tags,
		autoTags: note.autoTags,
		classSessionId: note.classSessionId,
		preview: markdownPreview(note.content),
		linkCount,
		createdAt: note.createdAt,
		updatedAt: note.updatedAt,
	};
}

/** Nota ativa do aluno; NOT_FOUND se não existir, for de outro aluno ou estiver na lixeira. */
export async function requireActiveNote(
	db: Executor,
	userId: string,
	noteId: string,
	message = "Nota não encontrada",
): Promise<Note> {
	const [note] = await db
		.select()
		.from(notes)
		.where(
			and(
				eq(notes.id, noteId),
				eq(notes.userId, userId),
				isNull(notes.deletedAt),
			),
		);
	if (!note) throw notFound(message);
	return note;
}

/** Ids e títulos das notas ativas do aluno. */
export async function activeNoteTitles(
	db: Executor,
	userId: string,
): Promise<Array<{ id: string; title: string }>> {
	return db
		.select({ id: notes.id, title: notes.title })
		.from(notes)
		.where(and(eq(notes.userId, userId), isNull(notes.deletedAt)));
}

/** Erro se outra nota ativa do aluno já usa o título (sem diferenciar caixa). */
export async function assertTitleAvailable(
	db: Executor,
	userId: string,
	title: string,
	exceptNoteId?: string,
): Promise<void> {
	const key = titleKey(title);
	const taken = (await activeNoteTitles(db, userId)).some(
		(note) => note.id !== exceptNoteId && titleKey(note.title) === key,
	);
	if (taken) throw conflict(`Já existe uma nota chamada "${title}".`);
}

/** Tags automáticas para uma nota vinculada à aula (a matéria em slug). */
export async function autoTagsForClass(
	db: Executor,
	classSessionId: string | null,
): Promise<string[]> {
	if (!classSessionId) return [];
	const [session] = await db
		.select({ subject: classSessions.subject })
		.from(classSessions)
		.where(eq(classSessions.id, classSessionId));
	if (!session) throw badRequest("Aula não encontrada");
	return autoTagsForSubject(session.subject);
}

/**
 * Recria os vínculos `wikilink` saindo da nota a partir dos `[[links]]` do
 * texto: o texto é a fonte da verdade. Links para títulos que não existem
 * (ou estão na lixeira) não geram vínculo — o app os mostra como não resolvidos.
 */
export async function syncWikilinks(
	db: Executor,
	userId: string,
	noteId: string,
	content: string,
): Promise<void> {
	await db
		.delete(noteLinks)
		.where(
			and(
				eq(noteLinks.sourceNoteId, noteId),
				eq(noteLinks.linkType, "wikilink"),
			),
		);

	const keys = new Set(extractWikilinkTargets(content).map(titleKey));
	if (keys.size === 0) return;

	const targets = (await activeNoteTitles(db, userId)).filter(
		(note) => note.id !== noteId && keys.has(titleKey(note.title)),
	);
	if (targets.length === 0) return;

	await db.insert(noteLinks).values(
		targets.map((target) => ({
			sourceNoteId: noteId,
			targetNoteId: target.id,
			linkType: "wikilink" as const,
			reason: null,
			similarityScore: "1.00",
		})),
	);
}

/** Notas do aluno cujo texto menciona `[[title]]` (fora de código). */
async function notesMentioning(
	db: Executor,
	userId: string,
	title: string,
	opts: { includeTrashed: boolean; exceptNoteId?: string },
): Promise<Note[]> {
	const conditions = [
		eq(notes.userId, userId),
		ilike(notes.content, `%${escapeLike(title.trim())}%`),
	];
	if (!opts.includeTrashed) conditions.push(isNull(notes.deletedAt));
	if (opts.exceptNoteId) conditions.push(ne(notes.id, opts.exceptNoteId));

	const candidates = await db
		.select()
		.from(notes)
		.where(and(...conditions));
	return candidates.filter((note) => mentionsTitle(note.content, title));
}

/**
 * Re-sincroniza as notas que mencionam `[[title]]`. Usado quando uma nota com
 * esse título passa a existir (criada, renomeada ou restaurada), para que os
 * links que estavam "não resolvidos" virem vínculos.
 */
export async function resyncNotesMentioning(
	db: Executor,
	userId: string,
	title: string,
	exceptNoteId?: string,
): Promise<string[]> {
	const mentioning = await notesMentioning(db, userId, title, {
		includeTrashed: false,
		exceptNoteId,
	});
	for (const note of mentioning) {
		await syncWikilinks(db, userId, note.id, note.content);
	}
	return mentioning.map((note) => note.id);
}

/**
 * Ao renomear uma nota, reescreve `[[Antigo]]` → `[[Novo]]` (mantendo apelido
 * e seção) em todas as notas do aluno que apontavam para ela, inclusive as que
 * estão na lixeira. Devolve os ids das notas alteradas.
 */
export async function propagateRename(
	db: Executor,
	userId: string,
	noteId: string,
	oldTitle: string,
	newTitle: string,
): Promise<string[]> {
	const mentioning = await notesMentioning(db, userId, oldTitle, {
		includeTrashed: true,
		exceptNoteId: noteId,
	});
	const affected: string[] = [];
	const now = new Date();
	for (const note of mentioning) {
		const content = rewriteWikilinkTargets(note.content, oldTitle, newTitle);
		if (content === note.content) continue;
		await db
			.update(notes)
			.set({ content, updatedAt: now })
			.where(eq(notes.id, note.id));
		if (!note.deletedAt) await syncWikilinks(db, userId, note.id, content);
		affected.push(note.id);
	}
	return affected;
}

/** Quantos vínculos (de qualquer tipo, entre notas ativas) cada nota tem. */
export async function linkCounts(
	db: Executor,
	activeNoteIds: string[],
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (activeNoteIds.length === 0) return counts;
	const active = new Set(activeNoteIds);
	const links = await db
		.select({ source: noteLinks.sourceNoteId, target: noteLinks.targetNoteId })
		.from(noteLinks)
		.where(
			or(
				inArray(noteLinks.sourceNoteId, activeNoteIds),
				inArray(noteLinks.targetNoteId, activeNoteIds),
			),
		);
	// O mesmo par pode ter um vínculo `wikilink` e um semântico: conta como uma conexão.
	const pairs = new Set<string>();
	for (const { source, target } of links) {
		if (!active.has(source) || !active.has(target)) continue;
		const pair =
			source < target ? `${source}:${target}` : `${target}:${source}`;
		if (pairs.has(pair)) continue;
		pairs.add(pair);
		counts.set(source, (counts.get(source) ?? 0) + 1);
		counts.set(target, (counts.get(target) ?? 0) + 1);
	}
	return counts;
}

/** Notas ativas do aluno, na ordem das pastas, com a contagem de vínculos. */
export async function listNoteSummaries(
	db: Executor,
	userId: string,
): Promise<NoteSummary[]> {
	const rows = await db
		.select()
		.from(notes)
		.where(and(eq(notes.userId, userId), isNull(notes.deletedAt)))
		.orderBy(asc(notes.position), asc(notes.title));
	const counts = await linkCounts(
		db,
		rows.map((note) => note.id),
	);
	return rows.map((note) => toSummary(note, counts.get(note.id) ?? 0));
}

/** Para cada `[[link]]` distinto do texto, o id da nota ativa que ele resolve (ou null). */
export async function resolveWikilinkTargets(
	db: Executor,
	userId: string,
	content: string,
): Promise<Array<{ title: string; noteId: string | null }>> {
	const targets = extractWikilinkTargets(content);
	if (targets.length === 0) return [];
	const byKey = new Map(
		(await activeNoteTitles(db, userId)).map((note) => [
			titleKey(note.title),
			note.id,
		]),
	);
	return targets.map((title) => ({
		title,
		noteId: byKey.get(titleKey(title)) ?? null,
	}));
}
