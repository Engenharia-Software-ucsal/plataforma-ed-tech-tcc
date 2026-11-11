import { google } from "@ai-sdk/google";
import { type EmbeddingModel, embedMany } from "ai";
import type { EmbeddingProvider } from "./ports.js";

type Env = Record<string, string | undefined>;

export function hasEmbeddingConfig(env: Env = process.env): boolean {
	return Boolean(env.EMBEDDING_PROVIDER?.trim());
}

type Resolved = {
	model: EmbeddingModel;
	providerOptions: (kind: "document" | "query") => Record<string, any>;
};

// Para um novo provedor: instalar `@ai-sdk/<provedor>` e somar um case aqui.
function resolveEmbeddingModel(
	provider: string,
	modelId: string,
	dimensions: number,
): Resolved {
	switch (provider) {
		case "google":
			return {
				model: google.embedding(modelId),
				providerOptions: (kind) => ({
					google: {
						outputDimensionality: dimensions,
						taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
					},
				}),
			};
		default:
			throw new Error(
				`EMBEDDING_PROVIDER "${provider}" não é suportado. Disponíveis: google.`,
			);
	}
}

// Lotes pequenos cabem no limite de tokens por minuto do plano gratuito do Gemini.
const EMBED_BATCH_SIZE = 16;
const RATE_LIMIT_WAITS_MS = [20_000, 40_000, 60_000];

function isRateLimited(error: unknown): boolean {
	const status = (error as { statusCode?: number })?.statusCode;
	const lastStatus = (error as { lastError?: { statusCode?: number } })?.lastError?.statusCode;
	return status === 429 || lastStatus === 429 || /quota|rate limit/i.test(String(error));
}

/** Repete a chamada quando o provedor responde "limite excedido", esperando cada vez mais. */
export async function withRateLimitRetry<T>(
	fn: () => Promise<T>,
	wait: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
	waits: number[] = RATE_LIMIT_WAITS_MS,
): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fn();
		} catch (error) {
			const delay = waits[attempt];
			if (delay === undefined || !isRateLimited(error)) throw error;
			await wait(delay);
		}
	}
}

export function createEmbeddingProviderFromEnv(env: Env = process.env): EmbeddingProvider {
	const provider = env.EMBEDDING_PROVIDER?.trim();
	const modelId = env.EMBEDDING_MODEL?.trim();
	const dimensions = Number.parseInt(env.EMBEDDING_DIMENSIONS ?? "", 10);

	if (!provider || !modelId || !Number.isInteger(dimensions) || dimensions <= 0) {
		throw new Error(
			"Defina EMBEDDING_PROVIDER, EMBEDDING_MODEL e EMBEDDING_DIMENSIONS (número) no .env.",
		);
	}

	const { model, providerOptions } = resolveEmbeddingModel(provider, modelId, dimensions);

	return {
		modelId: `${provider}:${modelId}:${dimensions}`,
		dimensions,
		async embed(texts, kind) {
			const embeddings: number[][] = [];
			for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
				const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
				const result = await withRateLimitRetry(() =>
					embedMany({
						model,
						values: batch,
						providerOptions: providerOptions(kind),
						abortSignal: AbortSignal.timeout(120_000),
					}),
				);
				embeddings.push(...result.embeddings);
			}
			for (const vector of embeddings) {
				if (vector.length !== dimensions) {
					throw new Error(
						`O modelo devolveu vetores de ${vector.length} dimensões; esperado ${dimensions}.`,
					);
				}
			}
			return embeddings;
		},
	};
}
