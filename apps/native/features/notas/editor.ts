/**
 * Ações da barra de formatação do editor de notas. Funções puras: recebem o
 * texto e a seleção do TextInput e devolvem o texto novo e a seleção nova.
 */

export type TextSelection = { start: number; end: number };

export type FormatKind =
	| "bold"
	| "italic"
	| "code"
	| "wikilink"
	| "heading"
	| "bullet"
	| "task";

const WRAPPERS: Partial<Record<FormatKind, [string, string]>> = {
	bold: ["**", "**"],
	italic: ["*", "*"],
	code: ["`", "`"],
	wikilink: ["[[", "]]"],
};

const LINE_PREFIXES: Partial<Record<FormatKind, string>> = {
	heading: "## ",
	bullet: "- ",
	task: "- [ ] ",
};

export function applyFormat(
	text: string,
	selection: TextSelection,
	kind: FormatKind,
): { text: string; selection: TextSelection } {
	const start = Math.min(selection.start, selection.end);
	const end = Math.max(selection.start, selection.end);

	const wrapper = WRAPPERS[kind];
	if (wrapper) {
		const [open, close] = wrapper;
		const selected = text.slice(start, end);
		return {
			text: text.slice(0, start) + open + selected + close + text.slice(end),
			// Sem seleção: cursor entre os marcadores. Com seleção: o mesmo trecho continua selecionado.
			selection: { start: start + open.length, end: end + open.length },
		};
	}

	const prefix = LINE_PREFIXES[kind] as string;
	const lineStart = text.lastIndexOf("\n", start - 1) + 1;
	const nextBreak = text.indexOf("\n", end);
	const lineEnd = nextBreak === -1 ? text.length : nextBreak;
	const lines = text.slice(lineStart, lineEnd).split("\n");
	const allPrefixed = lines.every((line) => line.startsWith(prefix));

	const changed = lines.map((line) =>
		allPrefixed
			? line.slice(prefix.length)
			: stripListPrefix(line, kind, prefix),
	);
	const replaced = changed.join("\n");
	const firstLineDelta = (changed[0]?.length ?? 0) - (lines[0]?.length ?? 0);
	const totalDelta = replaced.length - (lineEnd - lineStart);

	return {
		text: text.slice(0, lineStart) + replaced + text.slice(lineEnd),
		selection: {
			start: Math.max(lineStart, start + firstLineDelta),
			end: Math.max(lineStart, end + totalDelta),
		},
	};
}

/** Troca um prefixo de lista/título existente pelo novo (ex.: "- " → "- [ ] "), em vez de empilhar. */
function stripListPrefix(
	line: string,
	kind: FormatKind,
	prefix: string,
): string {
	if (kind === "heading") return prefix + line.replace(/^#{1,6}\s+/, "");
	return prefix + line.replace(/^\s*(?:[-*+]\s+(?:\[[ xX]\]\s+)?)/, "");
}
