import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { busDepartures } from "../db/schema/index.js";
import { publicProcedure, router } from "../trpc/index.js";

export const busRouter = router({
	list: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.select().from(busDepartures).orderBy(busDepartures.time);
	}),

	byId: publicProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [departure] = await ctx.db
				.select()
				.from(busDepartures)
				.where(eq(busDepartures.id, input.id));
			if (!departure) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Bus departure not found",
				});
			}
			return departure;
		}),

	create: publicProcedure
		.input(
			z.object({
				time: z.string(),
				stop: z.enum(["UCSAL", "PITUACU"]),
				route: z.string(),
				status: z.string(),
				occupancy: z.enum(["vazio", "moderado", "cheio"]).default("vazio"),
				delayMinutes: z.number().int().nonnegative().default(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [created] = await ctx.db.insert(busDepartures).values(input).returning();
			return created;
		}),
});
