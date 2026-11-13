import { applyFormat } from "@/features/notas/editor";

describe("applyFormat", () => {
	it("envolve a seleção e mantém o mesmo trecho selecionado", () => {
		const result = applyFormat("um dois três", { start: 3, end: 7 }, "bold");
		expect(result.text).toBe("um **dois** três");
		expect(
			result.text.slice(result.selection.start, result.selection.end),
		).toBe("dois");
	});

	it("sem seleção, insere os marcadores e põe o cursor no meio", () => {
		const result = applyFormat("ver ", { start: 4, end: 4 }, "wikilink");
		expect(result.text).toBe("ver [[]]");
		expect(result.selection).toEqual({ start: 6, end: 6 });
	});

	it.each([
		["italic", "*x*"],
		["code", "`x`"],
	] as const)("aplica %s", (kind, expected) => {
		expect(applyFormat("x", { start: 0, end: 1 }, kind).text).toBe(expected);
	});

	it("aplica e remove o título da linha do cursor", () => {
		const added = applyFormat("a\nlinha\nb", { start: 4, end: 4 }, "heading");
		expect(added.text).toBe("a\n## linha\nb");
		expect(added.selection).toEqual({ start: 7, end: 7 });

		const removed = applyFormat(added.text, added.selection, "heading");
		expect(removed.text).toBe("a\nlinha\nb");
	});

	it("troca um título existente em vez de empilhar", () => {
		expect(applyFormat("# Linha", { start: 3, end: 3 }, "heading").text).toBe(
			"## Linha",
		);
	});

	it("transforma várias linhas selecionadas em lista e item de lista em tarefa", () => {
		const list = applyFormat("um\ndois", { start: 0, end: 7 }, "bullet");
		expect(list.text).toBe("- um\n- dois");

		const tasks = applyFormat(
			list.text,
			{ start: 0, end: list.text.length },
			"task",
		);
		expect(tasks.text).toBe("- [ ] um\n- [ ] dois");
	});
});
