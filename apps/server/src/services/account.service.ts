import { eq } from "drizzle-orm";
import { sessions, users } from "../db/schema/index.js";
import type { Context } from "../trpc/context.js";

type Db = Context["db"];

/** Palavra que o aluno precisa digitar para apagar a conta (também validada no app). */
export const DELETE_CONFIRMATION = "EXCLUIR";

/** Extrai o token de `Authorization: Bearer <token>`; null quando não há. */
export function bearerToken(header: string | undefined): string | null {
	if (!header?.startsWith("Bearer ")) return null;
	return header.split(" ")[1] || null;
}

/** Encerra uma sessão no servidor. Sem efeito se ela já não existir. */
export async function endSession(db: Db, sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Apaga a conta e tudo que depende dela. As tabelas `sessions`, `notes`
 * (e por consequência `note_links`), `quiz_attempts` e `class_enrollments`
 * têm `ON DELETE CASCADE` para `users`, então basta remover o usuário.
 * Aulas, materiais e bancos de perguntas são compartilhados e não são apagados.
 *
 * O acesso do app ao Google é revogado antes, para que o aluno não precise
 * ir à conta Google fazer isso. A revogação não bloqueia a exclusão.
 */
export async function deleteAccount(
	db: Db,
	user: { id: string; googleRefreshToken?: string | null },
	revokeGoogleToken: (token: string) => Promise<void>,
): Promise<void> {
	if (user.googleRefreshToken) {
		await revokeGoogleToken(user.googleRefreshToken);
	}
	await db.delete(users).where(eq(users.id, user.id));
}
