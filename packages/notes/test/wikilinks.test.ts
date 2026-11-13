import { describe, expect, it } from "vitest";
import {
	codeRanges,
	completeWikilink,
	extractWikilinkTargets,
	findOpenWikilink,
	mentionsTitle,
	parseWikilinkInner,
	parseWikilinks,
	rewriteWikilinkTargets,
} from "../src/index";

describe("parseWikilinkInner", () => {
	it.each([
		["Nota", { target: "Nota", alias: null, section: null }],
		["  Nota  ", { target: "Nota", alias: null, section: null }],
		["Nota|apelido", { target: "Nota", alias: "apelido", section: null }],
		["Nota#Seção", { target: "Nota", alias: null, section: "Seção" }],
		[
			"Nota#Seção|apelido",
			{ target: "Nota", alias: "apelido", section: "Seção" },
		],
		["Nota|", { target: "Nota", alias: null, section: null }],
	])("interpreta %j", (inner, expected) => {
		expect(parseWikilinkInner(inner)).toEqual(expected);
	});

	it.each(["", "   ", "#seção", "|apelido"])(
		"ignora %j sem destino",
		(inner) => {
			expect(parseWikilinkInner(inner)).toBeNull();
		},
	);
});

describe("parseWikilinks", () => {
	it("encontra vários links por linha com posição", () => {
		const content = "Ver [[A]] e [[B|bê]].";
		const links = parseWikilinks(content);
		expect(links.map((l) => l.target)).toEqual(["A", "B"]);
		expect(links[1]?.alias).toBe("bê");
		const first = links[0];
		expect(content.slice(first?.start, first?.end)).toBe("[[A]]");
	});

	it("ignora [[]] vazio e links quebrados em linhas", () => {
		expect(parseWikilinks("[[]] e [[A\nB]]")).toEqual([]);
	});

	it("ignora links dentro de código inline", () => {
		const links = parseWikilinks("Use `[[A]]` para linkar, como [[B]].");
		expect(links.map((l) => l.target)).toEqual(["B"]);
	});

	it("ignora links dentro de blocos de código", () => {
		const content = [
			"[[Fora]]",
			"```ts",
			"const x = '[[Dentro]]';",
			"```",
			"[[Depois]]",
		].join("\n");
		expect(parseWikilinks(content).map((l) => l.target)).toEqual([
			"Fora",
			"Depois",
		]);
	});

	it("bloco de código sem fechamento vai até o fim", () => {
		const content = "[[A]]\n~~~\n[[B]]";
		expect(parseWikilinks(content).map((l) => l.target)).toEqual(["A"]);
	});

	it("crases duplas delimitam código que contém crase simples", () => {
		const content = "``a ` [[B]]`` e [[C]]";
		expect(parseWikilinks(content).map((l) => l.target)).toEqual(["C"]);
	});
});

describe("codeRanges", () => {
	it("não marca nada em texto sem código", () => {
		expect(codeRanges("texto [[A]]")).toEqual([]);
	});
});

describe("extractWikilinkTargets", () => {
	it("deduplica sem diferenciar caixa e mantém a primeira grafia", () => {
		expect(
			extractWikilinkTargets("[[SOLID]] [[solid]] [[DIP]] [[Solid|s]]"),
		).toEqual(["SOLID", "DIP"]);
	});
});

describe("rewriteWikilinkTargets", () => {
	it("renomeia o destino preservando apelido e seção", () => {
		const content =
			"[[Antigo]], [[antigo|apelido]], [[Antigo#Intro]] e [[Outro]]";
		expect(rewriteWikilinkTargets(content, "Antigo", "Novo")).toBe(
			"[[Novo]], [[Novo|apelido]], [[Novo#Intro]] e [[Outro]]",
		);
	});

	it("não mexe em links dentro de código", () => {
		const content = "`[[Antigo]]` [[Antigo]]";
		expect(rewriteWikilinkTargets(content, "Antigo", "Novo")).toBe(
			"`[[Antigo]]` [[Novo]]",
		);
	});

	it("devolve o mesmo texto quando não há o que trocar", () => {
		const content = "sem links";
		expect(rewriteWikilinkTargets(content, "A", "B")).toBe(content);
	});
});

describe("mentionsTitle", () => {
	it("verifica menção sem diferenciar caixa", () => {
		expect(
			mentionsTitle("ver [[clean architecture]]", "Clean Architecture"),
		).toBe(true);
		expect(
			mentionsTitle("`[[Clean Architecture]]`", "Clean Architecture"),
		).toBe(false);
	});
});

describe("autocomplete", () => {
	it("detecta o [[ aberto antes do cursor", () => {
		const text = "Ligado a [[Arqu";
		expect(findOpenWikilink(text, text.length)).toEqual({
			start: 9,
			query: "Arqu",
		});
	});

	it("não detecta quando o link já foi fechado ou mudou de linha", () => {
		expect(findOpenWikilink("[[A]] depois", 12)).toBeNull();
		expect(findOpenWikilink("[[A\nb", 5)).toBeNull();
		expect(findOpenWikilink("sem link", 8)).toBeNull();
	});

	it("não detecta dentro de código", () => {
		const text = "`[[Arq";
		expect(findOpenWikilink(text, text.length)).toBeNull();
	});

	it("completa e consome o ]] que já estava depois do cursor", () => {
		const text = "Ver [[Arq]] agora";
		const result = completeWikilink(text, 4, 9, "Arquitetura Hexagonal");
		expect(result.text).toBe("Ver [[Arquitetura Hexagonal]] agora");
		expect(result.cursor).toBe("Ver [[Arquitetura Hexagonal]]".length);
	});
});
