import { eq, inArray } from "drizzle-orm";
import {
	type CourseMaterial,
	courseMaterials,
	materialChunks,
} from "../../db/schema/index.js";
import { chunkText } from "./chunker.js";
import { extractDriveFileId } from "./drive-downloader.js";
import {
	type EmbeddingProvider,
	type FileDownloader,
	type TextExtractor,
	UnsupportedMaterialError,
} from "./ports.js";

export const MAX_CHUNKS_PER_MATERIAL = 60;
const MIN_TEXT_CHARS = 200;

export type IngestionDeps = {
	downloader: FileDownloader;
	extractor: TextExtractor;
	embedder: EmbeddingProvider;
};

export type IngestionOutcome = "ready" | "unsupported" | "failed";

/** Baixa, lê, divide e vetoriza um PDF. Reprocessar troca os trechos antigos, sem duplicar. */
export async function ingestMaterial(
	db: any,
	deps: IngestionDeps,
	material: CourseMaterial,
	refreshToken: string,
): Promise<IngestionOutcome> {
	try {
		const driveFileId = extractDriveFileId(material);
		if (!driveFileId) {
			throw new UnsupportedMaterialError("Material sem arquivo do Drive vinculado.");
		}

		const { buffer, mimeType } = await deps.downloader.download(
			driveFileId,
			refreshToken,
		);
		if (mimeType !== "application/pdf") {
			throw new UnsupportedMaterialError(`Formato não suportado: ${mimeType}.`);
		}

		const text = (await deps.extractor.extract(buffer)).trim();
		if (text.length < MIN_TEXT_CHARS) {
			throw new UnsupportedMaterialError(
				"PDF sem texto extraível (provavelmente escaneado).",
			);
		}

		const allChunks = chunkText(text);
		const chunks = allChunks.slice(0, MAX_CHUNKS_PER_MATERIAL);
		const vectors = await deps.embedder.embed(chunks, "document");
		if (vectors.length !== chunks.length) {
			throw new Error(
				`Foram gerados ${vectors.length} vetores para ${chunks.length} trechos.`,
			);
		}

		await db.transaction(async (tx: any) => {
			await tx
				.delete(materialChunks)
				.where(eq(materialChunks.courseMaterialId, material.id));
			await tx.insert(materialChunks).values(
				chunks.map((content, index) => ({
					courseMaterialId: material.id,
					chunkIndex: index,
					content,
					embedding: vectors[index],
					embeddingModel: deps.embedder.modelId,
				})),
			);
			await tx
				.update(courseMaterials)
				.set({
					ingestionStatus: "ready",
					ingestionError:
						allChunks.length > chunks.length
							? `Texto truncado em ${MAX_CHUNKS_PER_MATERIAL} trechos.`
							: null,
					ingestedAt: new Date(),
				})
				.where(eq(courseMaterials.id, material.id));
		});
		return "ready";
	} catch (error) {
		const unsupported = error instanceof UnsupportedMaterialError;
		const message = error instanceof Error ? error.message : String(error);
		await db
			.update(courseMaterials)
			.set({
				ingestionStatus: unsupported ? "unsupported" : "failed",
				ingestionError: message.slice(0, 500),
			})
			.where(eq(courseMaterials.id, material.id));
		return unsupported ? "unsupported" : "failed";
	}
}

export type IngestionSummary = Record<IngestionOutcome, number>;

/**
 * Processa, um de cada vez, os PDFs das aulas ainda pendentes (ou que falharam).
 * `retry` também retoma materiais presos em "processing" (ex.: servidor reiniciou no meio).
 */
export async function ingestPendingMaterials(
	db: any,
	deps: IngestionDeps,
	options: { refreshToken: string; classSessionIds: string[]; retry?: boolean },
): Promise<IngestionSummary> {
	const summary: IngestionSummary = { ready: 0, unsupported: 0, failed: 0 };
	if (options.classSessionIds.length === 0) return summary;

	const claimable = options.retry
		? ["pending", "failed", "processing"]
		: ["pending", "failed"];

	const materials: CourseMaterial[] = await db
		.select()
		.from(courseMaterials)
		.where(inArray(courseMaterials.classSessionId, options.classSessionIds));

	for (const material of materials) {
		if (material.materialType !== "pdf") continue;
		if (!claimable.includes(material.ingestionStatus)) continue;

		const [claimed] = await db
			.update(courseMaterials)
			.set({ ingestionStatus: "processing", ingestionError: null })
			.where(eq(courseMaterials.id, material.id))
			.returning();
		if (!claimed) continue;

		const outcome = await ingestMaterial(db, deps, material, options.refreshToken);
		summary[outcome] += 1;
	}

	return summary;
}
