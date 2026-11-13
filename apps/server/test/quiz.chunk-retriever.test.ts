import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createEmbeddingProviderFromEnv,
	hasEmbeddingConfig,
	withRateLimitRetry,
} from "../src/services/ingestion/embedding-factory.js";
import type { EmbeddingProvider } from "../src/services/ingestion/ports.js";
import {
	cosineSimilarity,
	createChunkContextRetriever,
} from "../src/services/quiz/chunk-context-retriever.js";
import { InsufficientContextError } from "../src/services/quiz/ports.js";
import { appRouter } from "../src/trpc/router.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const MODEL = "teste:fake:3";

function embedder(): EmbeddingProvider & { embed: ReturnType<typeof vi.fn> } {
	return {
		modelId: MODEL,
		dimensions: 3,
		embed: vi.fn(async (texts: string[]) => texts.map(() => [1, 0, 0])),
	};
}

function seedMaterial(
	db: ReturnType<typeof createClassroomMockDatabase>,
	id: string,
	title: string,
	status = "ready",
) {
	db.materialsStore.push({
		id,
		classSessionId: CLASS_ID,
		title,
		materialType: "pdf",
		ingestionStatus: status,
	});
}

function seedChunk(
	db: ReturnType<typeof createClassroomMockDatabase>,
	materialId: string,
	index: number,
	embedding: number[],
	content = `trecho ${materialId}-${index}`,
	embeddingModel = MODEL,
) {
	db.chunksStore.push({
		id: crypto.randomUUID(),
		courseMaterialId: materialId,
		chunkIndex: index,
		content,
		embedding,
		embeddingModel,
	});
}

describe("cosineSimilarity", () => {
	it("mede o ângulo entre vetores, ignorando o tamanho", () => {
		expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
		expect(cosineSimilarity([1, 0], [0, 3])).toBeCloseTo(0);
		expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
	});
});

describe("createChunkContextRetriever", () => {
	let db: ReturnType<typeof createClassroomMockDatabase>;

	beforeEach(() => {
		db = createClassroomMockDatabase();
		db.classSessionsStore.push({ id: CLASS_ID, subject: "Processos de Negócio", topics: ["BPMN"] });
	});

	it("falha com mensagem clara quando nenhum documento da aula foi processado", async () => {
		seedMaterial(db, "m1", "Slides", "pending");
		const e = embedder();

		await expect(
			createChunkContextRetriever(db, e).getContext(CLASS_ID),
		).rejects.toBeInstanceOf(InsufficientContextError);
		expect(e.embed).not.toHaveBeenCalled();
	});

	it("escolhe os trechos mais parecidos com a aula, com o título do documento", async () => {
		seedMaterial(db, "m1", "Slides BPMN");
		seedChunk(db, "m1", 0, [0, 1, 0], "irrelevante");
		seedChunk(db, "m1", 1, [1, 0, 0], "conteúdo sobre BPMN");

		const e = embedder();
		const context = await createChunkContextRetriever(db, e).getContext(CLASS_ID);

		expect(context).toContain("[Slides BPMN] conteúdo sobre BPMN");
		expect(e.embed).toHaveBeenCalledWith(
			[expect.stringContaining("Processos de Negócio")],
			"query",
		);
	});

	it("limita os trechos por documento para cobrir mais de um material", async () => {
		seedMaterial(db, "m1", "Doc A");
		seedMaterial(db, "m2", "Doc B");
		for (let i = 0; i < 10; i++) seedChunk(db, "m1", i, [1, 0, 0]);
		seedChunk(db, "m2", 0, [0.5, 0.5, 0], "só do B");

		const context = await createChunkContextRetriever(db, embedder()).getContext(CLASS_ID);

		expect(context.filter((c) => c.startsWith("[Doc A]"))).toHaveLength(5);
		expect(context).toContain("[Doc B] só do B");
	});

	it("com um único documento, espalha os trechos pelo arquivo todo e ignora os outros", async () => {
		seedMaterial(db, "m1", "Doc A");
		seedMaterial(db, "m2", "Doc B");
		for (let i = 0; i < 40; i++) seedChunk(db, "m1", i, [1, 0, 0], `parte ${i}`);
		seedChunk(db, "m2", 0, [1, 0, 0], "do outro documento");

		const e = embedder();
		const context = await createChunkContextRetriever(db, e).getContext(CLASS_ID, {
			materialIds: ["m1"],
		});

		expect(context).toHaveLength(20);
		expect(context.every((c) => c.startsWith("[Doc A]"))).toBe(true);
		expect(context[0]).toContain("parte 0");
		expect(context.at(-1)).toMatch(/parte (37|38|39)/);
		expect(e.embed).not.toHaveBeenCalled();
	});

	it("com um único documento ainda não lido, avisa que está em processamento", async () => {
		seedMaterial(db, "m1", "Doc A", "pending");
		seedMaterial(db, "m2", "Doc B");
		seedChunk(db, "m2", 0, [1, 0, 0]);

		await expect(
			createChunkContextRetriever(db, embedder()).getContext(CLASS_ID, { materialIds: ["m1"] }),
		).rejects.toBeInstanceOf(InsufficientContextError);
	});

	it("ignora trechos gerados por outro modelo de embeddings", async () => {
		seedMaterial(db, "m1", "Doc A");
		seedChunk(db, "m1", 0, [1, 0, 0], "de outro modelo", "outro:modelo:3");

		await expect(
			createChunkContextRetriever(db, embedder()).getContext(CLASS_ID),
		).rejects.toBeInstanceOf(InsufficientContextError);
	});
});

describe("quiz.requestGeneration com embeddings configurados", () => {
	const user = {
		id: "u1",
		name: "Aluno",
		email: "a@ucsal.edu.br",
		avatarUrl: null,
		googleId: "g",
		googleRefreshToken: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	afterEach(() => vi.unstubAllEnvs());

	it("não gera o quiz enquanto os PDFs da aula não foram lidos", async () => {
		vi.stubEnv("EMBEDDING_PROVIDER", "google");
		vi.stubEnv("EMBEDDING_MODEL", "gemini-embedding-001");
		vi.stubEnv("EMBEDDING_DIMENSIONS", "768");
		const db = createClassroomMockDatabase();
		db.classSessionsStore.push({ id: CLASS_ID, subject: "BD", topics: [] });
		seedMaterial(db, "m1", "Slides", "pending");
		db.enrollmentsStore.push({ id: "e1", userId: "u1", classSessionId: CLASS_ID });

		const caller = appRouter.createCaller({
			db: db as any,
			user,
			req: {} as any,
			res: {} as any,
		});

		await expect(
			caller.quiz.requestGeneration({ classSessionId: CLASS_ID }),
		).rejects.toThrow("ainda estão sendo processados");
	});
});

describe("createEmbeddingProviderFromEnv", () => {
	it("hasEmbeddingConfig só é verdadeiro com provedor definido", () => {
		expect(hasEmbeddingConfig({})).toBe(false);
		expect(hasEmbeddingConfig({ EMBEDDING_PROVIDER: " " })).toBe(false);
		expect(hasEmbeddingConfig({ EMBEDDING_PROVIDER: "google" })).toBe(true);
	});

	it("exige modelo e dimensões numéricas", () => {
		expect(() => createEmbeddingProviderFromEnv({ EMBEDDING_PROVIDER: "google" })).toThrow(
			"EMBEDDING_MODEL",
		);
		expect(() =>
			createEmbeddingProviderFromEnv({
				EMBEDDING_PROVIDER: "google",
				EMBEDDING_MODEL: "m",
				EMBEDDING_DIMENSIONS: "abc",
			}),
		).toThrow("EMBEDDING_DIMENSIONS");
	});

	it("recusa provedor desconhecido", () => {
		expect(() =>
			createEmbeddingProviderFromEnv({
				EMBEDDING_PROVIDER: "inexistente",
				EMBEDDING_MODEL: "m",
				EMBEDDING_DIMENSIONS: "3",
			}),
		).toThrow("não é suportado");
	});

	it("monta o provedor do Google com identificador do modelo, sem chamar a rede", () => {
		const provider = createEmbeddingProviderFromEnv({
			EMBEDDING_PROVIDER: "google",
			EMBEDDING_MODEL: "gemini-embedding-001",
			EMBEDDING_DIMENSIONS: "768",
		});
		expect(provider.modelId).toBe("google:gemini-embedding-001:768");
		expect(provider.dimensions).toBe(768);
	});
});

describe("rotas de materiais", () => {
	const user = {
		id: "u1",
		name: "Aluno",
		email: "a@ucsal.edu.br",
		avatarUrl: null,
		googleId: "g",
		googleRefreshToken: "tok",
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	function callerFor(db: any, u: typeof user | null = user) {
		return appRouter.createCaller({ db, user: u, req: {} as any, res: {} as any });
	}

	it("mostra o andamento da leitura dos PDFs só para quem está matriculado", async () => {
		const db = createClassroomMockDatabase();
		db.classSessionsStore.push({ id: CLASS_ID, subject: "BD", topics: [] });
		seedMaterial(db, "m1", "A.pdf", "ready");
		seedMaterial(db, "m2", "B.pdf", "failed");
		db.materialsStore.push({
			id: "v1",
			classSessionId: CLASS_ID,
			title: "Vídeo",
			materialType: "video",
			ingestionStatus: "pending",
		});

		await expect(
			callerFor(db).materials.ingestionStatus({ classSessionId: CLASS_ID }),
		).rejects.toThrow("Class session not found");

		db.enrollmentsStore.push({ id: "e1", userId: "u1", classSessionId: CLASS_ID });
		const status = await callerFor(db).materials.ingestionStatus({
			classSessionId: CLASS_ID,
		});

		expect(status.totalPdfs).toBe(2);
		expect(status.counts).toEqual({ ready: 1, failed: 1 });
		expect(status.materials).toEqual([
			{ id: "m1", title: "A.pdf", status: "ready", reason: null },
			{ id: "m2", title: "B.pdf", status: "failed", reason: "error" },
		]);
	});

	it("exige login e não inicia ingestão sem embeddings configurados", async () => {
		const db = createClassroomMockDatabase();
		db.enrollmentsStore.push({ id: "e1", userId: "u1", classSessionId: CLASS_ID });

		await expect(
			callerFor(db, null).materials.ingestionStatus({ classSessionId: CLASS_ID }),
		).rejects.toThrow("Usuário não autenticado");
		expect(
			await callerFor(db).materials.startIngestion({ classSessionId: CLASS_ID }),
		).toEqual({ started: false });
	});
});

describe("withRateLimitRetry", () => {
	const quotaError = Object.assign(new Error("You exceeded your current quota"), {
		statusCode: 429,
	});

	it("espera e tenta de novo quando o provedor responde limite excedido", async () => {
		const wait = vi.fn(async () => {});
		const fn = vi.fn().mockRejectedValueOnce(quotaError).mockResolvedValueOnce("ok");

		expect(await withRateLimitRetry(fn, wait, [10, 20])).toBe("ok");
		expect(wait).toHaveBeenCalledWith(10);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("desiste depois de esgotar as esperas", async () => {
		const wait = vi.fn(async () => {});
		const fn = vi.fn().mockRejectedValue(quotaError);

		await expect(withRateLimitRetry(fn, wait, [10, 20])).rejects.toThrow("quota");
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("não espera quando o erro é de outro tipo", async () => {
		const wait = vi.fn(async () => {});
		const fn = vi.fn().mockRejectedValue(new Error("arquivo corrompido"));

		await expect(withRateLimitRetry(fn, wait, [10])).rejects.toThrow("corrompido");
		expect(wait).not.toHaveBeenCalled();
	});
});
