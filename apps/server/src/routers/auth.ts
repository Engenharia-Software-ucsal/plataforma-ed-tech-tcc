import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { authenticateWithGoogle } from "../services/auth.service.js";
import { publicProcedure, router } from "../trpc/index.js";

export const authRouter = router({
	me: publicProcedure.query(({ ctx }) => ctx.user ?? null),

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
