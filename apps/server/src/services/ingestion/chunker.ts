const DEFAULT_SIZE = 2000;
const DEFAULT_OVERLAP = 250;

/** Divide o texto em trechos de ~`size` caracteres, preferindo cortar no fim de uma frase. */
export function chunkText(
	text: string,
	{ size = DEFAULT_SIZE, overlap = DEFAULT_OVERLAP } = {},
): string[] {
	const clean = text
		.replace(/\r/g, "")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	if (!clean) return [];

	const minEnd = Math.floor(size * 0.6);
	const chunks: string[] = [];
	let start = 0;

	while (start < clean.length) {
		let end = Math.min(start + size, clean.length);
		if (end < clean.length) {
			const tail = clean.slice(start + minEnd, end);
			const cut = Math.max(
				tail.lastIndexOf("\n"),
				tail.lastIndexOf(". "),
				tail.lastIndexOf("? "),
				tail.lastIndexOf("! "),
			);
			if (cut > 0) end = start + minEnd + cut + 1;
		}

		const piece = clean.slice(start, end).trim();
		if (piece) chunks.push(piece);
		if (end >= clean.length) break;
		start = Math.max(end - overlap, start + 1);
	}

	return chunks;
}
