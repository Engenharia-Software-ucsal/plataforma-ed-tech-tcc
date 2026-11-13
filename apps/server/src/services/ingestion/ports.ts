export interface FileDownloader {
	download(
		driveFileId: string,
		refreshToken: string,
	): Promise<{ buffer: Uint8Array; mimeType: string }>;
}

export interface TextExtractor {
	extract(buffer: Uint8Array): Promise<string>;
}

export interface EmbeddingProvider {
	/** "document" para trechos de PDF, "query" para a consulta de busca. */
	embed(texts: string[], kind: "document" | "query"): Promise<number[][]>;
	/** "provedor:modelo:dimensões", gravado junto de cada vetor. */
	readonly modelId: string;
	readonly dimensions: number;
}

/** Motivos curtos e seguros de mostrar ao aluno quando um material não é suportado. */
export type UnsupportedReason = "no_file" | "scanned" | "format";

/** Textos gravados em `ingestionError`; `unsupportedReason` os traduz de volta para o código. */
export const UNSUPPORTED_MESSAGES = {
	no_file: "Material sem arquivo do Drive vinculado.",
	scanned: "PDF sem texto extraível (provavelmente escaneado).",
	format: "Formato não suportado",
} as const;

export function unsupportedReason(error: string | null | undefined): UnsupportedReason {
	if (error?.startsWith(UNSUPPORTED_MESSAGES.no_file)) return "no_file";
	if (error?.startsWith(UNSUPPORTED_MESSAGES.scanned)) return "scanned";
	return "format";
}

/** Motivo mostrado ao aluno: só "unsupported" e "failed" têm um; os demais estados não. */
export function ingestionReason(
	status: string,
	error: string | null | undefined,
): UnsupportedReason | "error" | null {
	if (status === "unsupported") return unsupportedReason(error);
	if (status === "failed") return "error";
	return null;
}

/** O material não pode ser processado (ex.: sem arquivo no Drive, PDF escaneado). */
export class UnsupportedMaterialError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnsupportedMaterialError";
	}
}
