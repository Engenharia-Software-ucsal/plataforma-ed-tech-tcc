import { beforeEach, describe, expect, it, vi } from "vitest";
import { chunkText } from "../src/services/ingestion/chunker.js";
import { extractDriveFileId } from "../src/services/ingestion/drive-downloader.js";
import {
	ingestMaterial,
	ingestPendingMaterials,
	MAX_CHUNKS_PER_MATERIAL,
} from "../src/services/ingestion/ingest-material.js";
import type {
	EmbeddingProvider,
	FileDownloader,
	TextExtractor,
} from "../src/services/ingestion/ports.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

const LONG_TEXT = `${"Modelagem BPMN representa o processo de negócio com eventos, tarefas e gateways. ".repeat(10)}\n\n${"O Business Model Canvas organiza a proposta de valor em nove blocos. ".repeat(10)}`;

function fakeEmbedder(): EmbeddingProvider {
	return {
		modelId: "teste:fake:3",
		dimensions: 3,
		embed: vi.fn(async (texts: string[]) =>
			texts.map((t) => [t.includes("BPMN") ? 1 : 0, t.includes("Canvas") ? 1 : 0, 0.1]),
		),
	};
}

function deps(overrides: {
	text?: string;
	mimeType?: string;
	downloadError?: Error;
	embedder?: EmbeddingProvider;
} = {}) {
	const downloader: FileDownloader = {
		download: vi.fn(async () => {
			if (overrides.downloadError) throw overrides.downloadError;
			return {
				buffer: new Uint8Array([1, 2, 3]),
				mimeType: overrides.mimeType ?? "application/pdf",
			};
		}),
	};
	const extractor: TextExtractor = {
		extract: vi.fn(async () => overrides.text ?? LONG_TEXT),
	};
	return { downloader, extractor, embedder: overrides.embedder ?? fakeEmbedder() };
}

function material(over: Record<string, unknown> = {}) {
	return {
		id: crypto.randomUUID(),
		classSessionId: "aula-1",
		googleMaterialId: "mat-1-2-DRIVEID_abc-123",
		title: "Slides BPMN.pdf",
		fileUrl: "https://drive.google.com/file/d/DRIVEID_abc-123/view",
		materialType: "pdf",
		summary: null,
		ingestionStatus: "pending",
		ingestionError: null,
		ingestedAt: null,
		createdAt: new Date(),
		...over,
	};
}

describe("chunkText", () => {
	it("devolve lista vazia para texto vazio", () => {
		expect(chunkText("   \n  ")).toEqual([]);
	});

	it("mantém texto curto em um único trecho", () => {
		expect(chunkText("Texto curto.")).toEqual(["Texto curto."]);
	});

	it("divide texto longo em trechos limitados, com sobreposição e sem perder o fim", () => {
		const text = "Frase número um sobre processos. ".repeat(200).trim();
		const chunks = chunkText(text, { size: 500, overlap: 100 });

		expect(chunks.length).toBeGreaterThan(5);
		expect(chunks.every((c) => c.length <= 500)).toBe(true);
		expect(chunks.at(-1)?.endsWith("processos.")).toBe(true);
		expect(chunks[0]?.endsWith(".")).toBe(true);
	});
});

describe("extractDriveFileId", () => {
	it("lê o ID do link /d/", () => {
		expect(
			extractDriveFileId({
				fileUrl: "https://drive.google.com/file/d/AbC_123-x/view?usp=drive_web",
				googleMaterialId: null,
			}),
		).toBe("AbC_123-x");
	});

	it("lê o ID do link open?id=", () => {
		expect(
			extractDriveFileId({
				fileUrl: "https://drive.google.com/open?id=ZZ9-aa",
				googleMaterialId: null,
			}),
		).toBe("ZZ9-aa");
	});

	it("usa o ID gravado pelo sync quando o link do Drive não traz o ID", () => {
		expect(
			extractDriveFileId({
				fileUrl: "https://drive.google.com/drive/folders",
				googleMaterialId: "mat-123-456-FILE-ID_9",
			}),
		).toBe("FILE-ID_9");
	});

	it("devolve null quando o link é do Classroom, sem arquivo do Drive", () => {
		expect(
			extractDriveFileId({
				fileUrl: "https://classroom.google.com/c/123/m/456",
				googleMaterialId: "mat-123-456-789",
			}),
		).toBeNull();
	});
});

describe("ingestMaterial", () => {
	let db: ReturnType<typeof createClassroomMockDatabase>;

	beforeEach(() => {
		db = createClassroomMockDatabase();
	});

	function seed(m = material()) {
		db.materialsStore.push(m);
		return m;
	}

	it("baixa, lê, divide, vetoriza e grava os trechos", async () => {
		const m = seed();
		const d = deps();

		const outcome = await ingestMaterial(db, d, m as any, "refresh");

		expect(outcome).toBe("ready");
		expect(d.downloader.download).toHaveBeenCalledWith("DRIVEID_abc-123", "refresh");
		expect(db.chunksStore.length).toBeGreaterThan(0);
		expect(db.chunksStore.every((c) => c.embeddingModel === "teste:fake:3")).toBe(true);
		expect(db.chunksStore.map((c) => c.chunkIndex)).toEqual(
			db.chunksStore.map((_, i) => i),
		);
		expect(db.materialsStore[0].ingestionStatus).toBe("ready");
		expect(db.materialsStore[0].ingestedAt).toBeInstanceOf(Date);
		expect(db.materialsStore[0].ingestionError).toBeNull();
	});

	it("reprocessar troca os trechos antigos, sem duplicar", async () => {
		const m = seed();

		await ingestMaterial(db, deps(), m as any, "refresh");
		const firstCount = db.chunksStore.length;
		await ingestMaterial(db, deps(), m as any, "refresh");

		expect(db.chunksStore).toHaveLength(firstCount);
	});

	it("marca como não suportado e não baixa nada quando não há arquivo do Drive", async () => {
		const m = seed(
			material({
				fileUrl: "https://classroom.google.com/c/1/m/2",
				googleMaterialId: "mat-1-2-3",
			}),
		);
		const d = deps();

		expect(await ingestMaterial(db, d, m as any, "refresh")).toBe("unsupported");
		expect(d.downloader.download).not.toHaveBeenCalled();
		expect(db.materialsStore[0].ingestionStatus).toBe("unsupported");
		expect(db.materialsStore[0].ingestionError).toContain("sem arquivo do Drive");
	});

	it("marca como não suportado quando o arquivo não é PDF", async () => {
		const m = seed();
		const outcome = await ingestMaterial(
			db,
			deps({ mimeType: "application/vnd.google-apps.presentation" }),
			m as any,
			"refresh",
		);

		expect(outcome).toBe("unsupported");
		expect(db.materialsStore[0].ingestionError).toContain("Formato não suportado");
	});

	it("marca como não suportado quando o PDF não tem texto (escaneado)", async () => {
		const m = seed();
		const outcome = await ingestMaterial(
			db,
			deps({ text: "  p. 1  " }),
			m as any,
			"refresh",
		);

		expect(outcome).toBe("unsupported");
		expect(db.materialsStore[0].ingestionError).toContain("escaneado");
		expect(db.chunksStore).toHaveLength(0);
	});

	it("marca como falho, com o motivo, quando o download dá erro", async () => {
		const m = seed();
		const outcome = await ingestMaterial(
			db,
			deps({ downloadError: new Error("insufficient authentication scopes") }),
			m as any,
			"refresh",
		);

		expect(outcome).toBe("failed");
		expect(db.materialsStore[0].ingestionStatus).toBe("failed");
		expect(db.materialsStore[0].ingestionError).toContain("insufficient");
		expect(db.chunksStore).toHaveLength(0);
	});

	it("marca como falho quando o provedor devolve menos vetores que trechos", async () => {
		const m = seed();
		const embedder: EmbeddingProvider = {
			modelId: "teste:fake:3",
			dimensions: 3,
			embed: vi.fn(async () => [[0, 0, 0]]),
		};

		const text = "Modelagem de processos de negócio com BPMN e canvas. ".repeat(200);
		const outcome = await ingestMaterial(db, deps({ embedder, text }), m as any, "refresh");

		expect(outcome).toBe("failed");
		expect(db.materialsStore[0].ingestionError).toContain("vetores");
		expect(db.chunksStore).toHaveLength(0);
	});

	it("limita a quantidade de trechos e avisa que o texto foi truncado", async () => {
		const m = seed();
		const huge = "Parágrafo longo sobre modelagem de processos de negócio. ".repeat(6000);

		await ingestMaterial(db, deps({ text: huge }), m as any, "refresh");

		expect(db.chunksStore).toHaveLength(MAX_CHUNKS_PER_MATERIAL);
		expect(db.materialsStore[0].ingestionStatus).toBe("ready");
		expect(db.materialsStore[0].ingestionError).toContain("truncado");
	});
});

describe("ingestPendingMaterials", () => {
	let db: ReturnType<typeof createClassroomMockDatabase>;

	beforeEach(() => {
		db = createClassroomMockDatabase();
	});

	it("processa só PDFs pendentes ou que falharam, e ignora o resto", async () => {
		db.materialsStore.push(
			material({ id: "pendente", ingestionStatus: "pending" }),
			material({ id: "falhou", ingestionStatus: "failed" }),
			material({ id: "pronto", ingestionStatus: "ready" }),
			material({ id: "nao-suportado", ingestionStatus: "unsupported" }),
			material({ id: "travado", ingestionStatus: "processing" }),
			material({ id: "video", materialType: "video" }),
		);

		const summary = await ingestPendingMaterials(db, deps(), {
			refreshToken: "refresh",
			classSessionIds: ["aula-1"],
		});

		expect(summary).toEqual({ ready: 2, unsupported: 0, failed: 0 });
		const status = Object.fromEntries(
			db.materialsStore.map((m) => [m.id, m.ingestionStatus]),
		);
		expect(status).toMatchObject({
			pendente: "ready",
			falhou: "ready",
			pronto: "ready",
			"nao-suportado": "unsupported",
			travado: "processing",
			video: "pending",
		});
	});

	it("com retry, também retoma o material preso em processamento", async () => {
		db.materialsStore.push(material({ id: "travado", ingestionStatus: "processing" }));

		const summary = await ingestPendingMaterials(db, deps(), {
			refreshToken: "refresh",
			classSessionIds: ["aula-1"],
			retry: true,
		});

		expect(summary.ready).toBe(1);
	});

	it("conta cada resultado e não para quando um PDF falha", async () => {
		db.materialsStore.push(
			material({ id: "a" }),
			material({ id: "b", fileUrl: "https://classroom.google.com/c/1/m/2", googleMaterialId: "mat-1-2-3" }),
		);
		const d = deps();
		(d.downloader.download as any).mockRejectedValueOnce(new Error("403"));

		const summary = await ingestPendingMaterials(db, d, {
			refreshToken: "refresh",
			classSessionIds: ["aula-1"],
		});

		expect(summary).toEqual({ ready: 0, unsupported: 1, failed: 1 });
	});

	it("não faz nada sem aulas", async () => {
		const d = deps();
		const summary = await ingestPendingMaterials(db, d, {
			refreshToken: "refresh",
			classSessionIds: [],
		});
		expect(summary).toEqual({ ready: 0, unsupported: 0, failed: 0 });
		expect(d.downloader.download).not.toHaveBeenCalled();
	});
});
