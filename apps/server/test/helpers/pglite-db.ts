import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../src/db/schema/index.js";
import { classSessions, users } from "../../src/db/schema/index.js";
import type { Context } from "../../src/trpc/context.js";
import { appRouter } from "../../src/trpc/router.js";

/**
 * Postgres de verdade em memória (PGlite) com as migrações do projeto
 * aplicadas. Usado onde o banco falso de `classroom-mock-db.ts` não basta:
 * transações, índices únicos parciais, `lower()`, ILIKE, arrays.
 */
export async function createTestDatabase() {
	const client = new PGlite();
	const db = drizzle(client, { schema });
	await migrate(db, {
		migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
	});

	return {
		client,
		/** Mesmo formato do banco da aplicação, para entrar no contexto do tRPC. */
		db: db as unknown as Context["db"],
		async reset() {
			await client.exec(
				"TRUNCATE note_links, notes, folders, sessions, users, class_sessions RESTART IDENTITY CASCADE",
			);
		},
		async close() {
			await client.close();
		},
	};
}

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

export async function createUser(db: Context["db"], name = "Aluno") {
	const [user] = await db
		.insert(users)
		.values({
			name,
			email: `${name.toLowerCase().replace(/\s+/g, ".")}.${crypto.randomUUID()}@ucsal.edu.br`,
		})
		.returning();
	if (!user) throw new Error("Falha ao criar usuário de teste");
	return user;
}

export async function createClassSession(db: Context["db"], subject: string) {
	const [session] = await db
		.insert(classSessions)
		.values({
			subject,
			professor: "Prof. Teste",
			room: "Sala 1",
			startTime: "08:00",
			endTime: "09:40",
		})
		.returning();
	if (!session) throw new Error("Falha ao criar aula de teste");
	return session;
}

export function callerFor(db: Context["db"], user: Context["user"]) {
	return appRouter.createCaller({
		db,
		user,
		req: {} as never,
		res: {} as never,
	});
}
