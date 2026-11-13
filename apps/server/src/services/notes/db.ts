import { TRPCError } from "@trpc/server";
import type { ExtractTablesWithRelations, SQL } from "drizzle-orm";
import { eq, isNull } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgColumn, PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "../../db/schema/index.js";

/**
 * O banco ou uma transação aberta nele. Os serviços de notas aceitam os dois
 * para que o router decida o escopo da transação.
 */
export type Executor = PgDatabase<
	NodePgQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

/** `coluna = id`, ou `coluna IS NULL` quando o id é nulo (raiz). */
export function parentIs(column: PgColumn, id: string | null): SQL {
	return id === null ? isNull(column) : eq(column, id);
}

/** O Postgres recusou por índice único (código 23505). O Drizzle às vezes embrulha o erro em `cause`. */
export function isUniqueViolation(error: unknown): boolean {
	const code = (value: unknown) =>
		typeof value === "object" && value !== null && "code" in value
			? (value as { code?: unknown }).code
			: undefined;
	if (code(error) === "23505") return true;
	const cause =
		typeof error === "object" && error !== null && "cause" in error
			? (error as { cause?: unknown }).cause
			: undefined;
	return code(cause) === "23505";
}

/** Escapa `%`, `_` e `\` para usar o texto num ILIKE. */
export function escapeLike(text: string): string {
	return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function notFound(message: string): TRPCError {
	return new TRPCError({ code: "NOT_FOUND", message });
}

export function badRequest(message: string): TRPCError {
	return new TRPCError({ code: "BAD_REQUEST", message });
}

export function conflict(message: string): TRPCError {
	return new TRPCError({ code: "CONFLICT", message });
}
