import { titleKey } from "./titles";

/**
 * Um `[[wikilink]]` encontrado no texto.
 *
 * Sintaxe aceita: `[[Título]]`, `[[Título|apelido]]`, `[[Título#Seção]]` e
 * `[[Título#Seção|apelido]]`. A seção é lida mas ainda não é usada para navegar.
 */
export type Wikilink = {
	/** Trecho completo, com os colchetes. */
	raw: string;
	/** Título da nota de destino, sem espaços nas pontas. */
	target: string;
	alias: string | null;
	section: string | null;
	/** Posição de `[[` no texto. */
	start: number;
	/** Posição logo depois de `]]`. */
	end: number;
};

export type WikilinkParts = Pick<Wikilink, "target" | "alias" | "section">;

const WIKILINK_PATTERN = /\[\[([^[\]\n]*)\]\]/g;
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;

/** Interpreta o que fica entre `[[` e `]]`. Devolve null para `[[]]` ou `[[#seção]]`. */
export function parseWikilinkInner(inner: string): WikilinkParts | null {
	const pipe = inner.indexOf("|");
	const targetPart = pipe === -1 ? inner : inner.slice(0, pipe);
	const aliasPart = pipe === -1 ? null : inner.slice(pipe + 1).trim();

	const hash = targetPart.indexOf("#");
	const target = (hash === -1 ? targetPart : targetPart.slice(0, hash)).trim();
	const section =
		hash === -1 ? null : targetPart.slice(hash + 1).trim() || null;

	if (target.length === 0) return null;
	return { target, alias: aliasPart || null, section };
}

/**
 * Intervalos `[início, fim)` do texto que são código (blocos cercados por
 * ``` ou ~~~ e trechos entre crases). Wikilinks dentro deles não contam.
 */
export function codeRanges(content: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	const lines = content.split("\n");
	let offset = 0;
	let fence: { marker: string; start: number } | null = null;
	const proseSegments: Array<[number, number]> = [];
	let proseStart = 0;

	for (const line of lines) {
		const lineEnd = offset + line.length;
		const match = FENCE_PATTERN.exec(line);
		if (fence) {
			if (
				match?.[1]?.startsWith(fence.marker[0] as string) &&
				match[1].length >= fence.marker.length
			) {
				ranges.push([fence.start, lineEnd]);
				fence = null;
				proseStart = lineEnd + 1;
			}
		} else if (match?.[1]) {
			proseSegments.push([proseStart, offset]);
			fence = { marker: match[1], start: offset };
		}
		offset = lineEnd + 1;
	}

	if (fence) {
		// Bloco sem fechamento: vai até o fim do texto.
		ranges.push([fence.start, content.length]);
	} else {
		proseSegments.push([proseStart, content.length]);
	}

	for (const [start, end] of proseSegments) {
		for (const range of inlineCodeRanges(content.slice(start, end))) {
			ranges.push([range[0] + start, range[1] + start]);
		}
	}

	return ranges.sort((a, b) => a[0] - b[0]);
}

/** Trechos entre crases (`código`), com a mesma quantidade de crases abrindo e fechando. */
function inlineCodeRanges(text: string): Array<[number, number]> {
	const ranges: Array<[number, number]> = [];
	let i = 0;
	while (i < text.length) {
		if (text[i] !== "`") {
			i++;
			continue;
		}
		let run = 0;
		while (text[i + run] === "`") run++;
		const marker = "`".repeat(run);
		const close = findClosingRun(text, i + run, marker);
		if (close === -1) {
			i += run;
			continue;
		}
		ranges.push([i, close + run]);
		i = close + run;
	}
	return ranges;
}

function findClosingRun(text: string, from: number, marker: string): number {
	let index = text.indexOf(marker, from);
	while (index !== -1) {
		const before = text[index - 1];
		const after = text[index + marker.length];
		if (before !== "`" && after !== "`") return index;
		index = text.indexOf(marker, index + 1);
	}
	return -1;
}

function insideRanges(
	position: number,
	ranges: Array<[number, number]>,
): boolean {
	return ranges.some(([start, end]) => position >= start && position < end);
}

/** Todos os wikilinks do texto, na ordem em que aparecem, ignorando os que estão em código. */
export function parseWikilinks(content: string): Wikilink[] {
	const ranges = codeRanges(content);
	const links: Wikilink[] = [];
	for (const match of content.matchAll(WIKILINK_PATTERN)) {
		const start = match.index ?? 0;
		if (insideRanges(start, ranges)) continue;
		const parts = parseWikilinkInner(match[1] ?? "");
		if (!parts) continue;
		links.push({
			...parts,
			raw: match[0],
			start,
			end: start + match[0].length,
		});
	}
	return links;
}

/**
 * Títulos de destino distintos (sem diferenciar caixa), na ordem da primeira
 * aparição. É o que o servidor resolve para gerar os vínculos `wikilink`.
 */
export function extractWikilinkTargets(content: string): string[] {
	const seen = new Set<string>();
	const targets: string[] = [];
	for (const link of parseWikilinks(content)) {
		const key = titleKey(link.target);
		if (seen.has(key)) continue;
		seen.add(key);
		targets.push(link.target);
	}
	return targets;
}

export function formatWikilink({
	target,
	alias,
	section,
}: WikilinkParts): string {
	const sectionPart = section ? `#${section}` : "";
	const aliasPart = alias ? `|${alias}` : "";
	return `[[${target}${sectionPart}${aliasPart}]]`;
}

/**
 * Troca o destino dos wikilinks que apontam para `oldTitle` por `newTitle`,
 * preservando apelido e seção. Usado quando uma nota é renomeada.
 * Devolve o mesmo texto (mesma referência) se nada mudou.
 */
export function rewriteWikilinkTargets(
	content: string,
	oldTitle: string,
	newTitle: string,
): string {
	const oldKey = titleKey(oldTitle);
	const links = parseWikilinks(content).filter(
		(link) => titleKey(link.target) === oldKey,
	);
	if (links.length === 0) return content;

	let result = "";
	let cursor = 0;
	for (const link of links) {
		result += content.slice(cursor, link.start);
		result += formatWikilink({ ...link, target: newTitle });
		cursor = link.end;
	}
	return result + content.slice(cursor);
}

/** O texto menciona `title` em algum wikilink fora de código? */
export function mentionsTitle(content: string, title: string): boolean {
	const key = titleKey(title);
	return parseWikilinks(content).some((link) => titleKey(link.target) === key);
}

/**
 * Se o cursor está logo depois de um `[[` ainda não fechado na mesma linha,
 * devolve onde ele começa e o que já foi digitado — usado no autocomplete.
 */
export function findOpenWikilink(
	text: string,
	cursor: number,
): { start: number; query: string } | null {
	const before = text.slice(0, cursor);
	const start = before.lastIndexOf("[[");
	if (start === -1) return null;
	const typed = before.slice(start + 2);
	if (/[\]\n[]/.test(typed)) return null;
	if (insideRanges(start, codeRanges(text))) return null;
	// Crase aberta e ainda não fechada antes do `[[`, na mesma linha: é código sendo digitado.
	const lineStart = before.lastIndexOf("\n", start) + 1;
	const backticks = before.slice(lineStart, start).split("`").length - 1;
	if (backticks % 2 === 1) return null;
	return { start, query: typed };
}

/**
 * Completa o wikilink aberto em `start` com `title`, consumindo um `]]` que
 * já exista logo depois do cursor. Devolve o texto novo e a posição do cursor.
 */
export function completeWikilink(
	text: string,
	start: number,
	cursor: number,
	title: string,
): { text: string; cursor: number } {
	let rest = text.slice(cursor);
	if (rest.startsWith("]]")) rest = rest.slice(2);
	const inserted = `[[${title}]]`;
	return {
		text: text.slice(0, start) + inserted + rest,
		cursor: start + inserted.length,
	};
}
