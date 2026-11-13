import { parseWikilinkInner } from "./wikilinks";

/**
 * Parser do subconjunto de Markdown que o editor de notas suporta.
 * Gera uma árvore simples que o app renderiza com componentes nativos
 * (sem WebView). O que não for reconhecido vira texto.
 *
 * Blocos: títulos (#..######), parágrafos, listas (-, *, +, 1.), listas de
 * tarefas (- [ ] / - [x]), citações (>), blocos de código (``` ou ~~~) e
 * linha horizontal (---). Listas aninhadas são achatadas.
 *
 * Inline: **negrito**, *itálico* / _itálico_, `código`, [texto](url) e
 * [[wikilinks]].
 */

export type MarkdownInline =
	| { type: "text"; text: string }
	| { type: "bold"; children: MarkdownInline[] }
	| { type: "italic"; children: MarkdownInline[] }
	| { type: "code"; text: string }
	| { type: "link"; href: string; children: MarkdownInline[] }
	| {
			type: "wikilink";
			target: string;
			alias: string | null;
			section: string | null;
			/** Texto exibido: o apelido, ou o título. */
			label: string;
	  };

export type MarkdownListItem = {
	/** null = item comum; true/false = tarefa marcada ou não. */
	checked: boolean | null;
	children: MarkdownInline[];
};

export type MarkdownBlock =
	| {
			type: "heading";
			level: 1 | 2 | 3 | 4 | 5 | 6;
			children: MarkdownInline[];
	  }
	| { type: "paragraph"; children: MarkdownInline[] }
	| { type: "list"; ordered: boolean; start: number; items: MarkdownListItem[] }
	| { type: "blockquote"; children: MarkdownInline[] }
	| { type: "code"; lang: string | null; text: string }
	| { type: "hr" };

const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})\s*([^`\s]*)\s*$/;
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const BLOCKQUOTE = /^\s{0,3}>\s?(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*(\d{1,9})[.)]\s+(.*)$/;
const TASK = /^\[( |x|X)\]\s+(.*)$/;

export function parseMarkdown(content: string): MarkdownBlock[] {
	const lines = content.replace(/\r\n?/g, "\n").split("\n");
	const blocks: MarkdownBlock[] = [];
	let paragraph: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length === 0) return;
		blocks.push({
			type: "paragraph",
			children: parseInline(paragraph.join("\n")),
		});
		paragraph = [];
	};

	let i = 0;
	while (i < lines.length) {
		const line = lines[i] as string;

		const fence = FENCE_OPEN.exec(line);
		if (fence) {
			flushParagraph();
			const marker = fence[1] as string;
			const body: string[] = [];
			i++;
			while (i < lines.length) {
				const current = lines[i] as string;
				const trimmed = current.trim();
				if (trimmed.startsWith(marker) && /^[`~]+$/.test(trimmed)) {
					i++;
					break;
				}
				body.push(current);
				i++;
			}
			blocks.push({
				type: "code",
				lang: fence[2] || null,
				text: body.join("\n"),
			});
			continue;
		}

		if (line.trim() === "") {
			flushParagraph();
			i++;
			continue;
		}

		const heading = HEADING.exec(line);
		if (heading) {
			flushParagraph();
			blocks.push({
				type: "heading",
				level: (heading[1] as string).length as 1 | 2 | 3 | 4 | 5 | 6,
				children: parseInline(heading[2] ?? ""),
			});
			i++;
			continue;
		}

		if (HR.test(line)) {
			flushParagraph();
			blocks.push({ type: "hr" });
			i++;
			continue;
		}

		if (BLOCKQUOTE.test(line)) {
			flushParagraph();
			const quote: string[] = [];
			while (i < lines.length) {
				const match = BLOCKQUOTE.exec(lines[i] as string);
				if (!match) break;
				quote.push(match[1] ?? "");
				i++;
			}
			blocks.push({
				type: "blockquote",
				children: parseInline(quote.join("\n")),
			});
			continue;
		}

		const bullet = BULLET.exec(line);
		const ordered = bullet ? null : ORDERED.exec(line);
		if (bullet || ordered) {
			flushParagraph();
			const isOrdered = ordered !== null;
			const items: MarkdownListItem[] = [];
			const start = ordered ? Number(ordered[1]) : 1;
			while (i < lines.length) {
				const current = lines[i] as string;
				const itemMatch = isOrdered
					? ORDERED.exec(current)
					: BULLET.exec(current);
				if (!itemMatch) break;
				const text = (isOrdered ? itemMatch[2] : itemMatch[1]) ?? "";
				const task = TASK.exec(text);
				items.push(
					task
						? { checked: task[1] !== " ", children: parseInline(task[2] ?? "") }
						: { checked: null, children: parseInline(text) },
				);
				i++;
			}
			blocks.push({ type: "list", ordered: isOrdered, start, items });
			continue;
		}

		paragraph.push(line);
		i++;
	}

	flushParagraph();
	return blocks;
}

const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)/;

export function parseInline(text: string): MarkdownInline[] {
	const nodes: MarkdownInline[] = [];
	let buffer = "";
	let i = 0;

	const pushText = () => {
		if (buffer.length === 0) return;
		nodes.push({ type: "text", text: buffer });
		buffer = "";
	};

	while (i < text.length) {
		const char = text[i] as string;
		const rest = text.slice(i);

		if (char === "`") {
			let run = 0;
			while (text[i + run] === "`") run++;
			const marker = "`".repeat(run);
			const close = text.indexOf(marker, i + run);
			if (close !== -1) {
				pushText();
				nodes.push({ type: "code", text: text.slice(i + run, close) });
				i = close + run;
				continue;
			}
			buffer += marker;
			i += run;
			continue;
		}

		if (rest.startsWith("[[")) {
			const close = text.indexOf("]]", i + 2);
			const inner = close === -1 ? null : text.slice(i + 2, close);
			const parts =
				inner !== null && !/[[\n]/.test(inner)
					? parseWikilinkInner(inner)
					: null;
			if (parts && close !== -1) {
				pushText();
				nodes.push({
					type: "wikilink",
					...parts,
					label: parts.alias ?? parts.target,
				});
				i = close + 2;
				continue;
			}
		}

		if (char === "[") {
			const link = LINK.exec(rest);
			if (link) {
				pushText();
				nodes.push({
					type: "link",
					href: link[2] as string,
					children: parseInline(link[1] as string),
				});
				i += link[0].length;
				continue;
			}
		}

		if ((char === "*" || char === "_") && text[i + 1] === char) {
			const marker = char + char;
			const close = text.indexOf(marker, i + 2);
			if (close > i + 2) {
				pushText();
				nodes.push({
					type: "bold",
					children: parseInline(text.slice(i + 2, close)),
				});
				i = close + 2;
				continue;
			}
		}

		if (char === "*" || char === "_") {
			const prev = text[i - 1];
			const opensWord =
				char === "*" || prev === undefined || !/[\p{L}\p{N}]/u.test(prev);
			const close = findItalicClose(text, i + 1, char);
			if (opensWord && close > i + 1) {
				pushText();
				nodes.push({
					type: "italic",
					children: parseInline(text.slice(i + 1, close)),
				});
				i = close + 1;
				continue;
			}
		}

		buffer += char;
		i++;
	}

	pushText();
	return nodes;
}

/** Fecha o itálico no próximo marcador simples (não duplo) que não esteja colado em espaço. */
function findItalicClose(text: string, from: number, marker: string): number {
	if (text[from] === " " || text[from] === undefined) return -1;
	let index = text.indexOf(marker, from);
	while (index !== -1) {
		const doubled = text[index + 1] === marker || text[index - 1] === marker;
		const afterSpace = text[index - 1] === " ";
		const next = text[index + 1];
		const closesWord =
			marker === "*" || next === undefined || !/[\p{L}\p{N}]/u.test(next);
		if (!doubled && !afterSpace && closesWord) return index;
		index = text.indexOf(marker, index + 1);
	}
	return -1;
}

/** Texto puro de um trecho (sem marcação), usado em prévias e buscas. */
export function inlineToPlainText(nodes: MarkdownInline[]): string {
	return nodes
		.map((node) => {
			switch (node.type) {
				case "text":
				case "code":
					return node.text;
				case "wikilink":
					return node.label;
				default:
					return inlineToPlainText(node.children);
			}
		})
		.join("");
}

/** Prévia de uma nota em texto puro, numa linha só. */
export function markdownPreview(content: string, maxLength = 160): string {
	const text = parseMarkdown(content)
		.map((block) => {
			switch (block.type) {
				case "code":
					return block.text;
				case "hr":
					return "";
				case "list":
					return block.items
						.map((item) => inlineToPlainText(item.children))
						.join(" ");
				default:
					return inlineToPlainText(block.children);
			}
		})
		.filter(Boolean)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
	return text.length > maxLength
		? `${text.slice(0, maxLength - 1).trimEnd()}…`
		: text;
}
