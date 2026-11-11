import { eq, inArray } from "drizzle-orm";
import { classSessions, courseMaterials, materialChunks } from "../../db/schema/index.js";
import type { EmbeddingProvider } from "../ingestion/ports.js";
import { type ContextRetriever, InsufficientContextError } from "./ports.js";

const TOP_K = 24;
const MAX_PER_MATERIAL = 5;
const SPREAD_MAX_CHUNKS = 20;

export function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		const x = a[i] as number;
		const y = b[i] as number;
		dot += x * y;
		normA += x * x;
		normB += y * y;
	}
	return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Contexto do quiz = trechos de PDF vindos da ingestão.
 * Aula inteira: os mais relevantes, no máximo `MAX_PER_MATERIAL` por documento.
 * Um único documento: trechos espalhados pelo arquivo todo, para cobrir o conteúdo inteiro.
 */
export function createChunkContextRetriever(
	db: any,
	embedder: EmbeddingProvider,
): ContextRetriever {
	return {
		async getContext(classSessionId, opts) {
			const [session] = await db
				.select()
				.from(classSessions)
				.where(eq(classSessions.id, classSessionId));
			const materials: Array<typeof courseMaterials.$inferSelect> = await db
				.select()
				.from(courseMaterials)
				.where(eq(courseMaterials.classSessionId, classSessionId));

			const scoped = opts?.materialIds
				? materials.filter((m) => opts.materialIds?.includes(m.id))
				: materials;
			const readyIds = scoped
				.filter((m) => m.ingestionStatus === "ready")
				.map((m) => m.id);
			const chunks: Array<typeof materialChunks.$inferSelect> = readyIds.length
				? await db
						.select()
						.from(materialChunks)
						.where(inArray(materialChunks.courseMaterialId, readyIds))
				: [];
			const usable = chunks.filter((c) => c.embeddingModel === embedder.modelId);

			if (usable.length === 0) {
				throw new InsufficientContextError(
					"Os documentos desta aula ainda estão sendo processados ou não puderam ser lidos. Tente de novo em alguns minutos.",
				);
			}

			const titleById = new Map(materials.map((m) => [m.id, m.title]));
			const label = (chunk: (typeof usable)[number]) =>
				`[${titleById.get(chunk.courseMaterialId)}] ${chunk.content}`;

			if (opts?.materialIds?.length === 1) {
				const ordered = [...usable].sort((a, b) => a.chunkIndex - b.chunkIndex);
				const step = Math.max(1, ordered.length / SPREAD_MAX_CHUNKS);
				const count = Math.min(ordered.length, SPREAD_MAX_CHUNKS);
				return Array.from({ length: count }, (_, i) =>
					label(ordered[Math.floor(i * step)] as (typeof usable)[number]),
				);
			}

			const topics: string[] = session?.topics ?? [];
			const query = [session?.subject, topics.length ? `Tópicos: ${topics.join(", ")}` : ""]
				.filter(Boolean)
				.join(". ");
			const [queryVector] = await embedder.embed([query], "query");
			if (!queryVector) throw new Error("O modelo não devolveu o vetor da consulta.");

			const ranked = usable
				.map((chunk) => ({ chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
				.sort((a, b) => b.score - a.score);

			const perMaterial = new Map<string, number>();
			const picked: typeof usable = [];
			for (const { chunk } of ranked) {
				const count = perMaterial.get(chunk.courseMaterialId) ?? 0;
				if (count >= MAX_PER_MATERIAL) continue;
				perMaterial.set(chunk.courseMaterialId, count + 1);
				picked.push(chunk);
				if (picked.length === TOP_K) break;
			}

			return picked
				.sort(
					(a, b) =>
						a.courseMaterialId.localeCompare(b.courseMaterialId) ||
						a.chunkIndex - b.chunkIndex,
				)
				.map(label);
		},
	};
}
