import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { classSessions, courseMaterials } from "../db/schema/index.js";
import {
	isUserEnrolled,
	listClassesForUser,
	listMaterialsForClasses,
} from "../services/class-enrollment.service.js";
import { syncClassroomForUser } from "../services/classroom.service.js";
import { startBackgroundIngestion } from "../services/ingestion/background.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/index.js";

export const classRouter = router({
	list: protectedProcedure
		.input(z.object({ semester: z.string().optional() }).optional())
		.query(({ ctx, input }) =>
			listClassesForUser(ctx.db, ctx.user.id, input?.semester),
		),

	byId: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const enrolled = await isUserEnrolled(ctx.db, ctx.user.id, input.id);
			const [session] = enrolled
				? await ctx.db
						.select()
						.from(classSessions)
						.where(eq(classSessions.id, input.id))
				: [];
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Class session not found",
				});
			}

			const materials = await ctx.db
				.select()
				.from(courseMaterials)
				.where(eq(courseMaterials.classSessionId, session.id));

			return {
				...session,
				materials,
			};
		}),

	create: publicProcedure
		.input(
			z.object({
				startTime: z.string(),
				endTime: z.string(),
				subject: z.string(),
				professor: z.string(),
				room: z.string(),
				topics: z.array(z.string()).optional(),
				difficultyLevel: z.enum(["facil", "medio", "dificil"]).default("medio"),
				difficultyScore: z.string().default("0.0"),
				difficultyReviewCount: z.number().int().nonnegative().default(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [created] = await ctx.db
				.insert(classSessions)
				.values(input)
				.returning();
			return created;
		}),

	syncFromClassroom: protectedProcedure.mutation(async ({ ctx }) => {
		const syncResult = await syncClassroomForUser({
			db: ctx.db,
			userId: ctx.user.id,
			refreshToken: ctx.user.googleRefreshToken ?? null,
		});
		const sessions = await listClassesForUser(ctx.db, ctx.user.id);
		const allMaterials = await listMaterialsForClasses(
			ctx.db,
			sessions.map((s) => s.id),
		);

		startBackgroundIngestion({
			db: ctx.db,
			userId: ctx.user.id,
			refreshToken: ctx.user.googleRefreshToken,
			classSessionIds: sessions.map((s) => s.id),
			log: ctx.req.log,
		});

		const courses = sessions.map((c) => ({
			...c,
			materials: allMaterials.filter((m) => m.classSessionId === c.id),
		}));

		return {
			...syncResult,
			courses,
		};
	}),

	updateSchedule: publicProcedure
		.input(
			z.object({
				id: z.string().min(1),
				startTime: z.string().min(1),
				endTime: z.string().min(1),
				room: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [updated] = await ctx.db
				.update(classSessions)
				.set({
					startTime: input.startTime,
					endTime: input.endTime,
					room: input.room,
					updatedAt: new Date(),
				})
				.where(eq(classSessions.id, input.id))
				.returning();

			if (!updated) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Class session not found",
				});
			}

			return updated;
		}),

	notifications: protectedProcedure.query(async ({ ctx }) => {
		const sessions = await listClassesForUser(ctx.db, ctx.user.id);
		const materials = await listMaterialsForClasses(
			ctx.db,
			sessions.map((s) => s.id),
		);

		const sessionMap = new Map(sessions.map((s) => [s.id, s]));

		return materials.map((mat, index) => {
			const session = sessionMap.get(mat.classSessionId);
			const subject = session?.subject ?? "Disciplina UCSAL";
			const professor = session?.professor ?? "Docente UCSAL";

			if (mat.materialType === "announcement") {
				return {
					id: mat.id,
					iconName: "graduation-cap" as const,
					iconTone: "accent" as const,
					title: mat.title,
					description: mat.summary ?? `${professor} publicou um aviso em ${subject}`,
					timeAgo: index === 0 ? "agora" : `${index * 15} min`,
					read: false,
					materialType: mat.materialType,
					classSessionId: mat.classSessionId,
				};
			}

			if (mat.materialType === "assignment") {
				return {
					id: mat.id,
					iconName: "triangle-alert" as const,
					iconTone: "warning" as const,
					title: "Nova atividade no Classroom",
					description: `${subject}: ${mat.title}`,
					timeAgo: "1h",
					read: false,
					materialType: mat.materialType,
					classSessionId: mat.classSessionId,
				};
			}

			return {
				id: mat.id,
				iconName: "sparkles" as const,
				iconTone: "accent" as const,
				title: "Novo material sincronizado",
				description: `${professor} enviou ${mat.title} (${subject})`,
				timeAgo: "2h",
				read: index > 2,
				materialType: mat.materialType,
				classSessionId: mat.classSessionId,
			};
		});
	}),
});
