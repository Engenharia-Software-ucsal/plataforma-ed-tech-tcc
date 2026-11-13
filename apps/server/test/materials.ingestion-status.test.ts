import { describe, expect, it } from "vitest";
import {
	ingestionReason,
	UNSUPPORTED_MESSAGES,
	unsupportedReason,
} from "../src/services/ingestion/ports.js";
import { appRouter } from "../src/trpc/router.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

describe("unsupportedReason", () => {
	it("traduz as mensagens gravadas para um código curto", () => {
		expect(unsupportedReason(UNSUPPORTED_MESSAGES.no_file)).toBe("no_file");
		expect(unsupportedReason(UNSUPPORTED_MESSAGES.scanned)).toBe("scanned");
		expect(unsupportedReason("Formato não suportado: application/zip.")).toBe("format");
	});

	it("cai em 'format' quando a mensagem é desconhecida ou está vazia", () => {
		expect(unsupportedReason("algo inesperado")).toBe("format");
		expect(unsupportedReason(null)).toBe("format");
	});
});

describe("ingestionReason", () => {
	it("só informa motivo para materiais não suportados ou com falha", () => {
		expect(ingestionReason("unsupported", UNSUPPORTED_MESSAGES.scanned)).toBe("scanned");
		expect(ingestionReason("failed", "ECONNRESET detalhe interno")).toBe("error");
		expect(ingestionReason("ready", null)).toBeNull();
		expect(ingestionReason("pending", null)).toBeNull();
		expect(ingestionReason("processing", null)).toBeNull();
	});
});

describe("materials.ingestionStatus", () => {
	const user = { id: "user-1", email: "a@b.c", name: "A" } as any;

	function setup() {
		const db = createClassroomMockDatabase();
		db.enrollmentsStore.push({ id: "e1", userId: "user-1", classSessionId: CLASS_ID });
		const pdf = (id: string, ingestionStatus: string, ingestionError: string | null = null) => ({
			id,
			classSessionId: CLASS_ID,
			title: `${id}.pdf`,
			materialType: "pdf",
			ingestionStatus,
			ingestionError,
		});
		db.materialsStore.push(
			pdf("pronto", "ready"),
			pdf("lendo", "processing"),
			pdf("escaneado", "unsupported", UNSUPPORTED_MESSAGES.scanned),
			pdf("falhou", "failed", "connect ECONNREFUSED 10.0.0.5:5432"),
			{ ...pdf("video", "pending"), materialType: "video" },
		);
		const caller = appRouter.createCaller({ db, user, req: {} as any, res: {} as any });
		return { caller, db };
	}

	it("devolve o motivo de cada PDF sem vazar a mensagem interna de erro", async () => {
		const { caller } = setup();
		const result = await caller.materials.ingestionStatus({ classSessionId: CLASS_ID });

		expect(result.totalPdfs).toBe(4);
		const byId = Object.fromEntries(result.materials.map((m: any) => [m.id, m]));
		expect(byId.pronto).toMatchObject({ status: "ready", reason: null });
		expect(byId.lendo).toMatchObject({ status: "processing", reason: null });
		expect(byId.escaneado).toMatchObject({ status: "unsupported", reason: "scanned" });
		expect(byId.falhou).toMatchObject({ status: "failed", reason: "error" });
		expect(JSON.stringify(result)).not.toContain("ECONNREFUSED");
	});

	it("exige matrícula na aula", async () => {
		const { db } = setup();
		const intruder = appRouter.createCaller({
			db,
			user: { ...user, id: "intruso" },
			req: {} as any,
			res: {} as any,
		});
		await expect(
			intruder.materials.ingestionStatus({ classSessionId: CLASS_ID }),
		).rejects.toThrow("Class session not found");
	});
});
