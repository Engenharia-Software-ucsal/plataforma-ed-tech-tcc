import { FOLDER_NAME_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from "./limits";

/**
 * Caracteres que quebram a sintaxe `[[Título|alias]]` / `[[Título#Seção]]`.
 * Como o título é o que o wikilink referencia, ele não pode contê-los.
 */
const FORBIDDEN_TITLE_CHARS = /[[\]|#]/;

export type NameValidation =
	| { ok: true; value: string }
	| { ok: false; error: string };

/**
 * Chave usada para comparar títulos: sem espaços nas pontas e sem diferenciar
 * maiúsculas/minúsculas. No banco, o equivalente é `lower(title)` (os títulos
 * já são gravados sem espaços nas pontas).
 */
export function titleKey(title: string): string {
	return title.trim().toLowerCase();
}

export function validateNoteTitle(raw: string): NameValidation {
	const value = raw.trim();
	if (value.length === 0) {
		return { ok: false, error: "O título é obrigatório." };
	}
	if (value.length > NOTE_TITLE_MAX_LENGTH) {
		return {
			ok: false,
			error: `O título pode ter no máximo ${NOTE_TITLE_MAX_LENGTH} caracteres.`,
		};
	}
	if (FORBIDDEN_TITLE_CHARS.test(value)) {
		return {
			ok: false,
			error: "O título não pode conter os caracteres [ ] | #.",
		};
	}
	return { ok: true, value };
}

export function validateFolderName(raw: string): NameValidation {
	const value = raw.trim();
	if (value.length === 0) {
		return { ok: false, error: "O nome da pasta é obrigatório." };
	}
	if (value.length > FOLDER_NAME_MAX_LENGTH) {
		return {
			ok: false,
			error: `O nome da pasta pode ter no máximo ${FOLDER_NAME_MAX_LENGTH} caracteres.`,
		};
	}
	return { ok: true, value };
}

/**
 * Devolve o primeiro nome livre na sequência `variant(1)`, `variant(2)`, ...
 * `isTaken` recebe o nome candidato (não a chave).
 */
export function firstAvailableName(
	isTaken: (candidate: string) => boolean,
	variant: (attempt: number) => string,
	maxAttempts = 1000,
): string {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const candidate = variant(attempt);
		if (!isTaken(candidate)) return candidate;
	}
	throw new Error("Não foi possível gerar um nome disponível.");
}

/** "Nova nota", "Nova nota 2", "Nova nota 3"... */
export function numberedName(base: string): (attempt: number) => string {
	return (attempt) => (attempt === 1 ? base : `${base} ${attempt}`);
}

/** "Título (restaurada)", "Título (restaurada 2)"... — usado ao restaurar da lixeira. */
export function restoredName(
	base: string,
	label = "restaurada",
): (attempt: number) => string {
	return (attempt) =>
		attempt === 1 ? `${base} (${label})` : `${base} (${label} ${attempt})`;
}

/** Nome livre entre `taken` (comparação sem diferenciar caixa). */
export function uniqueName(
	base: string,
	taken: Iterable<string>,
	variant: (attempt: number) => string = numberedName(base),
): string {
	const keys = new Set<string>();
	for (const name of taken) keys.add(titleKey(name));
	return firstAvailableName(
		(candidate) => keys.has(titleKey(candidate)),
		variant,
	);
}

/**
 * Nome para um item restaurado da lixeira: o original se estiver livre,
 * senão "Nome (restaurada)", "Nome (restaurada 2)"...
 */
export function nameForRestore(
	base: string,
	taken: Iterable<string>,
	label?: string,
): string {
	const keys = new Set<string>();
	for (const name of taken) keys.add(titleKey(name));
	if (!keys.has(titleKey(base))) return base;
	return uniqueName(base, keys, restoredName(base, label));
}
