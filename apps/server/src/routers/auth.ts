import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	bearerToken,
	DELETE_CONFIRMATION,
	deleteAccount,
	endSession,
} from "../services/account.service.js";
import {
	authenticateWithGoogle,
	revokeGoogleToken,
} from "../services/auth.service.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/index.js";

export const authRouter = router({
	me: publicProcedure.query(({ ctx }) => ctx.user ?? null),

	/** Encerra a sessão deste aparelho. Pública para limpar também sessões já expiradas. */
	logout: publicProcedure.mutation(async ({ ctx }) => {
		const token = bearerToken(ctx.req.headers?.authorization);
		if (token) await endSession(ctx.db, token);
		return { ok: true as const };
	}),

	/** Apaga a conta e os dados vinculados a ela. Exige a palavra de confirmação. */
	deleteAccount: protectedProcedure
		.input(z.object({ confirmation: z.literal(DELETE_CONFIRMATION) }))
		.mutation(async ({ ctx }) => {
			await deleteAccount(ctx.db, ctx.user, revokeGoogleToken);
			return { deleted: true as const };
		}),

	loginWithGoogle: publicProcedure
		.input(
			z.object({
				serverAuthCode: z.string(),
				idToken: z.string().optional(),
			}),
		)
		.mutation(async ({ input }) => {
			try {
				return await authenticateWithGoogle(
					input.serverAuthCode,
					input.idToken,
				);
			} catch (err: unknown) {
				if (err instanceof Error && err.message === "UNAUTHORIZED_DOMAIN") {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Use seu e-mail @ucsal.edu.br",
					});
				}
				console.error("[auth.loginWithGoogle]", err);
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Falha na autenticação",
					cause: err,
				});
			}
		}),
});
