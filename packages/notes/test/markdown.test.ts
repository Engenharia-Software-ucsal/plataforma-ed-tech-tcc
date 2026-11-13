import { describe, expect, it } from "vitest";
import { markdownPreview, parseInline, parseMarkdown } from "../src/index";

describe("parseMarkdown", () => {
	it("reconhece títulos, parágrafos e linha horizontal", () => {
		const blocks = parseMarkdown(
			"# Título\n\nTexto um\ncontinua\n\n---\n## Sub",
		);
		expect(blocks.map((b) => b.type)).toEqual([
			"heading",
			"paragraph",
			"hr",
			"heading",
		]);
		expect(blocks[0]).toMatchObject({
			level: 1,
			children: [{ type: "text", text: "Título" }],
		});
		expect(blocks[1]).toMatchObject({
			children: [{ type: "text", text: "Texto um\ncontinua" }],
		});
		expect(blocks[3]).toMatchObject({ level: 2 });
	});

	it("reconhece listas, listas numeradas e tarefas", () => {
		const blocks = parseMarkdown(
			"- a\n- [x] feito\n* [ ] pendente\n\n3. três\n4. quatro",
		);
		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toMatchObject({
			type: "list",
			ordered: false,
			items: [{ checked: null }, { checked: true }, { checked: false }],
		});
		expect(blocks[1]).toMatchObject({ type: "list", ordered: true, start: 3 });
	});

	it("reconhece citações em várias linhas", () => {
		const [quote] = parseMarkdown("> linha 1\n> linha 2");
		expect(quote).toMatchObject({
			type: "blockquote",
			children: [{ type: "text", text: "linha 1\nlinha 2" }],
		});
	});

	it("mantém o conteúdo do bloco de código cru, inclusive wikilinks", () => {
		const [code] = parseMarkdown(
			"```ts\nconst a = '[[Nota]]';\n# não é título\n```",
		);
		expect(code).toEqual({
			type: "code",
			lang: "ts",
			text: "const a = '[[Nota]]';\n# não é título",
		});
	});

	it("aceita texto vazio", () => {
		expect(parseMarkdown("")).toEqual([]);
	});
});

describe("parseInline", () => {
	it("reconhece negrito, itálico, código e links", () => {
		expect(
			parseInline("**forte** e *leve* e _também_ e `x` e [site](https://a.b)"),
		).toEqual([
			{ type: "bold", children: [{ type: "text", text: "forte" }] },
			{ type: "text", text: " e " },
			{ type: "italic", children: [{ type: "text", text: "leve" }] },
			{ type: "text", text: " e " },
			{ type: "italic", children: [{ type: "text", text: "também" }] },
			{ type: "text", text: " e " },
			{ type: "code", text: "x" },
			{ type: "text", text: " e " },
			{
				type: "link",
				href: "https://a.b",
				children: [{ type: "text", text: "site" }],
			},
		]);
	});

	it("reconhece wikilinks com apelido e seção", () => {
		expect(parseInline("ver [[Nota#Parte|apelido]]")).toEqual([
			{ type: "text", text: "ver " },
			{
				type: "wikilink",
				target: "Nota",
				alias: "apelido",
				section: "Parte",
				label: "apelido",
			},
		]);
	});

	it("aceita wikilink dentro de negrito", () => {
		expect(parseInline("**ver [[A]]**")).toEqual([
			{
				type: "bold",
				children: [
					{ type: "text", text: "ver " },
					{
						type: "wikilink",
						target: "A",
						alias: null,
						section: null,
						label: "A",
					},
				],
			},
		]);
	});

	it("não trata wikilink dentro de código inline", () => {
		expect(parseInline("`[[A]]`")).toEqual([{ type: "code", text: "[[A]]" }]);
	});

	it("deixa como texto marcadores sem fechamento e sublinhado no meio de palavra", () => {
		expect(parseInline("2 * 3 e snake_case_nome e **aberto")).toEqual([
			{ type: "text", text: "2 * 3 e snake_case_nome e **aberto" },
		]);
	});
});

describe("markdownPreview", () => {
	it("gera texto puro numa linha", () => {
		expect(
			markdownPreview("# Título\n\nVer **[[Nota|isso]]** e `código`."),
		).toBe("Título Ver isso e código.");
	});

	it("corta textos longos com reticências", () => {
		const preview = markdownPreview("a".repeat(300), 20);
		expect(preview).toHaveLength(20);
		expect(preview.endsWith("…")).toBe(true);
	});
});
