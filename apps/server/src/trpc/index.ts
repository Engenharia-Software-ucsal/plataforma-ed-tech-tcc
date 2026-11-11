import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

const isAuthenticated = middleware(({ ctx, next }) => {
	if (!ctx.user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Usuário não autenticado",
		});
	}
	return next({
		ctx: {
			// a partir daqui ctx.user não é mais null para quem usa protectedProcedure
			user: ctx.user,
		},
	});
});

export const protectedProcedure = publicProcedure.use(isAuthenticated);
