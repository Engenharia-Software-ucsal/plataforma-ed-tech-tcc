import { describe, expect, it } from "vitest";
import {
	autoTagsForSubject,
	NOTE_TITLE_MAX_LENGTH,
	nameForRestore,
	slugifySubject,
	titleKey,
	uniqueName,
	validateFolderName,
	validateNoteTitle,
} from "../src/index";

describe("validateNoteTitle", () => {
	it("aceita e apara títulos válidos", () => {
		expect(validateNoteTitle("  Clean Architecture  ")).toEqual({
			ok: true,
			value: "Clean Architecture",
		});
	});

	it.each([
		"",
		"   ",
		"Com [colchete",
		"Com | barra",
		"Com # cerquilha",
		"x".repeat(NOTE_TITLE_MAX_LENGTH + 1),
	])("rejeita %j", (title) => {
		expect(validateNoteTitle(title).ok).toBe(false);
	});
});

describe("validateFolderName", () => {
	it("aceita nomes com qualquer caractere e rejeita vazio", () => {
		expect(validateFolderName(" Aulas #1 ")).toEqual({
			ok: true,
			value: "Aulas #1",
		});
		expect(validateFolderName("  ").ok).toBe(false);
	});
});

describe("titleKey", () => {
	it("ignora caixa e espaços nas pontas", () => {
		expect(titleKey("  Ação  ")).toBe(titleKey("AÇÃO"));
	});
});

describe("uniqueName", () => {
	it("numera a partir de 2 sem diferenciar caixa", () => {
		expect(uniqueName("Nova nota", [])).toBe("Nova nota");
		expect(uniqueName("Nova nota", ["nova nota", "Nova Nota 2"])).toBe(
			"Nova nota 3",
		);
	});
});

describe("nameForRestore", () => {
	it("mantém o nome original quando está livre", () => {
		expect(nameForRestore("SOLID", ["DIP"])).toBe("SOLID");
	});

	it("aplica o sufixo de restauração quando o nome está em uso", () => {
		expect(nameForRestore("SOLID", ["solid"])).toBe("SOLID (restaurada)");
		expect(nameForRestore("SOLID", ["SOLID", "SOLID (restaurada)"])).toBe(
			"SOLID (restaurada 2)",
		);
	});
});

describe("slugifySubject", () => {
	it.each([
		["Engenharia de Software", "engenharia-de-software"],
		["Estrutura de Dados II", "estrutura-de-dados-ii"],
		["  Cálculo   Diferencial & Integral ", "calculo-diferencial-integral"],
		["Programação Orientada a Objetos", "programacao-orientada-a-objetos"],
	])("%j → %j", (subject, slug) => {
		expect(slugifySubject(subject)).toBe(slug);
	});

	it("devolve null quando não sobra nada", () => {
		expect(slugifySubject(" -- ")).toBeNull();
		expect(autoTagsForSubject(" -- ")).toEqual([]);
		expect(autoTagsForSubject(null)).toEqual([]);
		expect(autoTagsForSubject("BD")).toEqual(["bd"]);
	});
});
