import { z } from "zod";
import { publicProcedure, router } from "../trpc/index.js";
import { authenticateWithGoogle } from "../services/auth.service.js";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
	loginWithGoogle: publicProcedure
		.input(z.object({ serverAuthCode: z.string() }))
		.mutation(async ({ input }) => {
			try {
				return await authenticateWithGoogle(input.serverAuthCode);
			} catch (err: any) {
				if (err.message === "UNAUTHORIZED_DOMAIN") {
					throw new TRPCError({ code: "FORBIDDEN", message: "Use seu e-mail @ucsal.edu.br" });
				}
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha na autenticação" });
			}
		}),
});
