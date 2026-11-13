import { readFileSync } from "node:fs";
import { autoTagsForSubject } from "@busuucsal-v3/notes";
import { asc } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { notes } from "../src/db/schema/index.js";
import {
	createClassSession,
	createTestDatabase,
	createUser,
	type TestDatabase,
} from "./helpers/pglite-db.js";

/**
 * Os passos de dados da migração 0008 foram escritos à mão. Aqui eles rodam de
 * novo sobre dados "antigos" para conferir o resultado — em especial que o slug
 * da matéria em SQL bate com `slugifySubject` do app.
 */
const statements = readFileSync(
	new URL("../drizzle/0008_add_notes_folders_trash.sql", import.meta.url),
	"utf8",
)
	.split("--> statement-breakpoint")
	.map((statement) =>
		statement
			.split("\n")
			.filter((line) => !line.trim().startsWith("--"))
			.join("\n")
			.trim(),
	);

function dataStatement(startsWith: string): string {
	const statement = statements.find((s) => s.startsWith(startsWith));
	if (!statement) throw new Error(`Passo não encontrado: ${startsWith}`);
	return statement;
}

let testDb: TestDatabase;

beforeAll(async () => {
	testDb = await createTestDatabase();
});

afterAll(async () => {
	await testDb.close();
});

describe("migração 0008 (dados)", () => {
	it("preenche a hashtag da matéria igual ao slugifySubject do app", async () => {
		await testDb.reset();
		const user = await createUser(testDb.db);
		const subjects = [
			"Engenharia de Software",
			"Estrutura de Dados II",
			"Cálculo Diferencial & Integral",
			"PROGRAMAÇÃO ORIENTADA A OBJETOS",
			"Ética e Legislação",
			"--",
		];
		for (const [index, subject] of subjects.entries()) {
			const session = await createClassSession(testDb.db, subject);
			await testDb.db.insert(notes).values({
				userId: user.id,
				title: `Nota ${index}`,
				content: "",
				classSessionId: session.id,
			});
		}

		await testDb.client.exec(
			dataStatement(`UPDATE "notes" AS n SET "auto_tags"`),
		);

		const rows = await testDb.db
			.select({ title: notes.title, autoTags: notes.autoTags })
			.from(notes)
			.orderBy(asc(notes.title));
		expect(rows.map((row) => row.autoTags)).toEqual(
			subjects.map((subject) => autoTagsForSubject(subject)),
		);
	});

	it("renomeia títulos repetidos do mesmo aluno, mantendo o mais antigo", async () => {
		await testDb.reset();
		const user = await createUser(testDb.db);
		const other = await createUser(testDb.db, "Outro");
		// O índice único só vale para notas ativas: uma das cópias fica "na lixeira" para caber.
		await testDb.db.insert(notes).values([
			{
				userId: user.id,
				title: "SOLID",
				content: "",
				createdAt: new Date("2026-01-01"),
			},
			{
				userId: user.id,
				title: "solid",
				content: "",
				createdAt: new Date("2026-02-01"),
				deletedAt: new Date("2026-03-01"),
			},
			{ userId: other.id, title: "SOLID", content: "" },
		]);

		await testDb.client.exec(dataStatement(`UPDATE "notes" AS n SET "title"`));

		const rows = await testDb.db
			.select({ title: notes.title })
			.from(notes)
			.orderBy(asc(notes.createdAt));
		expect(rows.map((row) => row.title).sort()).toEqual([
			"SOLID",
			"SOLID",
			"solid (2)",
		]);
	});
});
