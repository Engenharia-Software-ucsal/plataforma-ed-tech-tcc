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

/** O material não pode ser processado (ex.: sem arquivo no Drive, PDF escaneado). */
export class UnsupportedMaterialError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "UnsupportedMaterialError";
	}
}
