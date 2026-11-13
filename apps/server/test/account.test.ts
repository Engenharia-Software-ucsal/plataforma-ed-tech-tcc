import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessions, users } from "../src/db/schema/index.js";
import {
	bearerToken,
	deleteAccount,
	endSession,
} from "../src/services/account.service.js";

const revokeGoogleToken = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("../src/services/auth.service.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("../src/services/auth.service.js")>()),
	revokeGoogleToken,
}));

const { appRouter } = await import("../src/trpc/router.js");

type DeleteCall = { table: unknown; paramValues: unknown[] };

/** Banco falso que só registra os `delete(tabela).where(...)` recebidos. */
function createFakeDb() {
	const calls: DeleteCall[] = [];
	const db = {
		delete: (table: unknown) => ({
			where: async (condition: { queryChunks?: Array<{ value?: unknown }> }) => {
				calls.push({
					table,
					paramValues: (condition.queryChunks ?? []).map((chunk) => chunk?.value),
				});
			},
		}),
	};
	return { db: db as any, calls };
}

const user = {
	id: "user-1",
	name: "Ana",
	email: "ana@ucsal.edu.br",
	googleRefreshToken: "refresh-123",
} as any;

function caller(db: unknown, options: { user?: unknown; authorization?: string } = {}) {
	return appRouter.createCaller({
		db,
		user: "user" in options ? options.user : user,
		req: { headers: { authorization: options.authorization } } as any,
		res: {} as any,
	} as any);
}

beforeEach(() => {
	revokeGoogleToken.mockClear();
});

describe("bearerToken", () => {
	it("extrai o token do cabeçalho Authorization", () => {
		expect(bearerToken("Bearer abc123")).toBe("abc123");
	});

	it("devolve null sem cabeçalho, com outro esquema ou sem token", () => {
		expect(bearerToken(undefined)).toBeNull();
		expect(bearerToken("Basic abc")).toBeNull();
		expect(bearerToken("Bearer ")).toBeNull();
	});
});

describe("endSession", () => {
	it("apaga só a sessão informada", async () => {
		const { db, calls } = createFakeDb();
		await endSession(db, "sess-1");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.table).toBe(sessions);
		expect(calls[0]?.paramValues).toContain("sess-1");
	});
});

describe("deleteAccount", () => {
	it("revoga o acesso ao Google e apaga o usuário (o resto cai por cascade)", async () => {
		const { db, calls } = createFakeDb();
		const revoke = vi.fn(async () => {});
		await deleteAccount(db, user, revoke);
		expect(revoke).toHaveBeenCalledWith("refresh-123");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.table).toBe(users);
		expect(calls[0]?.paramValues).toContain("user-1");
	});

	it("apaga a conta mesmo sem token do Google guardado", async () => {
		const { db, calls } = createFakeDb();
		const revoke = vi.fn(async () => {});
		await deleteAccount(db, { id: "user-2", googleRefreshToken: null }, revoke);
		expect(revoke).not.toHaveBeenCalled();
		expect(calls[0]?.table).toBe(users);
	});
});

describe("auth.logout", () => {
	it("encerra a sessão do token recebido", async () => {
		const { db, calls } = createFakeDb();
		const result = await caller(db, { authorization: "Bearer sess-9" }).auth.logout();
		expect(result).toEqual({ ok: true });
		expect(calls[0]?.table).toBe(sessions);
		expect(calls[0]?.paramValues).toContain("sess-9");
	});

	it("não falha nem apaga nada quando não há token", async () => {
		const { db, calls } = createFakeDb();
		const result = await caller(db, { user: null }).auth.logout();
		expect(result).toEqual({ ok: true });
		expect(calls).toHaveLength(0);
	});
});

describe("auth.deleteAccount", () => {
	it("apaga a conta do usuário logado quando a confirmação está certa", async () => {
		const { db, calls } = createFakeDb();
		const result = await caller(db).auth.deleteAccount({ confirmation: "EXCLUIR" });
		expect(result).toEqual({ deleted: true });
		expect(revokeGoogleToken).toHaveBeenCalledWith("refresh-123");
		expect(calls).toHaveLength(1);
		expect(calls[0]?.table).toBe(users);
		expect(calls[0]?.paramValues).toContain("user-1");
	});

	it("recusa confirmação errada sem tocar no banco", async () => {
		const { db, calls } = createFakeDb();
		await expect(
			caller(db).auth.deleteAccount({ confirmation: "excluir" as any }),
		).rejects.toThrow();
		expect(calls).toHaveLength(0);
		expect(revokeGoogleToken).not.toHaveBeenCalled();
	});

	it("exige login", async () => {
		const { db, calls } = createFakeDb();
		await expect(
			caller(db, { user: null }).auth.deleteAccount({ confirmation: "EXCLUIR" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(calls).toHaveLength(0);
	});
});
