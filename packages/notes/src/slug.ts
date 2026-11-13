/**
 * Tag automática de uma nota vinculada a uma aula: o nome da matéria em slug.
 * "Estrutura de Dados II" → "estrutura-de-dados-ii".
 *
 * A migration 0008 faz o mesmo em SQL para as notas antigas; se mudar a regra
 * aqui, mude lá também.
 */
export function slugifySubject(subject: string): string | null {
	const slug = subject
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug.length > 0 ? slug : null;
}

/** Tags automáticas de uma nota a partir da matéria da aula vinculada. */
export function autoTagsForSubject(
	subject: string | null | undefined,
): string[] {
	if (!subject) return [];
	const slug = slugifySubject(subject);
	return slug ? [slug] : [];
}
