import { createDriveFileDownloader } from "./drive-downloader.js";
import { createEmbeddingProviderFromEnv, hasEmbeddingConfig } from "./embedding-factory.js";
import { ingestPendingMaterials } from "./ingest-material.js";
import { createPdfTextExtractor } from "./pdf-extractor.js";

type Logger = { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void };

const running = new Set<string>();

/**
 * Dispara a ingestão sem bloquear a resposta. Retorna false quando não deve rodar
 * (sem provedor de embeddings configurado, sem token ou já em andamento para o aluno).
 */
export function startBackgroundIngestion(params: {
	db: any;
	userId: string;
	refreshToken: string | null | undefined;
	classSessionIds: string[];
	retry?: boolean;
	log?: Partial<Logger>;
}): boolean {
	const { db, userId, refreshToken, classSessionIds, retry, log } = params;
	if (!hasEmbeddingConfig() || !refreshToken || classSessionIds.length === 0) return false;
	if (running.has(userId)) return false;

	let deps;
	try {
		deps = {
			downloader: createDriveFileDownloader(),
			extractor: createPdfTextExtractor(),
			embedder: createEmbeddingProviderFromEnv(),
		};
	} catch (err) {
		log?.error?.({ err }, "Ingestão não iniciada: configuração de embeddings inválida");
		return false;
	}

	running.add(userId);
	void ingestPendingMaterials(db, deps, { refreshToken, classSessionIds, retry })
		.then((summary) => log?.info?.(summary, "Ingestão de PDFs concluída"))
		.catch((err) => log?.error?.({ err }, "Ingestão de PDFs falhou"))
		.finally(() => running.delete(userId));
	return true;
}
