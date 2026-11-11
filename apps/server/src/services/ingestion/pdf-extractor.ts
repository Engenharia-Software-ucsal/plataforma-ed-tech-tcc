import { extractText } from "unpdf";
import type { TextExtractor } from "./ports.js";

export function createPdfTextExtractor(): TextExtractor {
	return {
		async extract(buffer) {
			const { text } = await extractText(buffer, { mergePages: true });
			return text;
		},
	};
}
