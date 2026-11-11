import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { courseMaterials } from "../db/schema/index.js";
import { isUserEnrolled } from "../services/class-enrollment.service.js";
import { startBackgroundIngestion } from "../services/ingestion/background.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/index.js";

const classInput = z.object({ classSessionId: z.string().uuid() });

async function assertEnrolled(ctx: { db: any; user: { id: string } }, classSessionId: string) {
	if (!(await isUserEnrolled(ctx.db, ctx.user.id, classSessionId))) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Class session not found" });
	}
}

export const materialsRouter = router({
	listByClass: publicProcedure.input(classInput).query(async ({ ctx, input }) => {
		return ctx.db
			.select()
			.from(courseMaterials)
			.where(eq(courseMaterials.classSessionId, input.classSessionId));
	}),

	/** Andamento da leitura dos PDFs da aula (sem expor mensagens internas de erro). */
	ingestionStatus: protectedProcedure.input(classInput).query(async ({ ctx, input }) => {
		await assertEnrolled(ctx, input.classSessionId);
		const materials = await ctx.db
			.select()
			.from(courseMaterials)
			.where(eq(courseMaterials.classSessionId, input.classSessionId));

		const pdfs = materials.filter((m: any) => m.materialType === "pdf");
		const counts: Record<string, number> = {};
		for (const m of pdfs) counts[m.ingestionStatus] = (counts[m.ingestionStatus] ?? 0) + 1;

		return {
			totalPdfs: pdfs.length,
			counts,
			materials: pdfs.map((m: any) => ({
				id: m.id,
				title: m.title,
				status: m.ingestionStatus,
			})),
		};
	}),

	/** Reprocessa os PDFs da aula que falharam ou ficaram presos. */
	startIngestion: protectedProcedure.input(classInput).mutation(async ({ ctx, input }) => {
		await assertEnrolled(ctx, input.classSessionId);
		const started = startBackgroundIngestion({
			db: ctx.db,
			userId: ctx.user.id,
			refreshToken: ctx.user.googleRefreshToken,
			classSessionIds: [input.classSessionId],
			retry: true,
			log: ctx.req.log,
		});
		return { started };
	}),
});
