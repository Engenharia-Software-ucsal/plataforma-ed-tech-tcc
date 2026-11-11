import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	enrollUserInClasses,
	listClassesForUser,
} from "../src/services/class-enrollment.service.js";
import { syncClassroomForUser } from "../src/services/classroom.service.js";
import { appRouter } from "../src/trpc/router.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

function course(googleCourseId: string, subject: string, materialTitle: string) {
	return {
		googleCourseId,
		semester: "2026.2",
		startTime: "08:00",
		endTime: "09:30",
		subject,
		professor: "Docente UCSAL",
		room: "Sala 1",
		topics: [subject],
		difficultyLevel: "medio" as const,
		difficultyScore: "3.0",
		difficultyReviewCount: 0,
		materials: [
			{
				googleMaterialId: `gm-${googleCourseId}`,
				title: materialTitle,
				fileUrl: `https://classroom.google.com/m/${googleCourseId}`,
				materialType: "pdf" as const,
				summary: `Resumo de ${materialTitle}`,
			},
		],
	};
}

function user(id: string) {
	return {
		id,
		name: `Aluno ${id}`,
		email: `${id}@ucsal.edu.br`,
		avatarUrl: null,
		googleId: `g-${id}`,
		googleRefreshToken: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

describe("matrícula de alunos nas aulas", () => {
	let db: ReturnType<typeof createClassroomMockDatabase>;

	function callerFor(userId: string | null) {
		return appRouter.createCaller({
			db: db as any,
			user: userId ? user(userId) : null,
			req: {} as any,
			res: {} as any,
		});
	}

	beforeEach(() => {
		db = createClassroomMockDatabase();
	});

	it("matricula só nas turmas devolvidas pelo Classroom de cada aluno", async () => {
		await syncClassroomForUser({
			db,
			userId: "ana",
			refreshToken: "tok",
			fetcher: vi.fn().mockResolvedValue([course("gc-1", "Big Data", "Slides BD")]),
		});
		await syncClassroomForUser({
			db,
			userId: "davi",
			refreshToken: "tok",
			fetcher: vi.fn().mockResolvedValue([course("gc-2", "Redes", "Slides Redes")]),
		});

		const anaClasses = await listClassesForUser(db, "ana");
		const daviClasses = await listClassesForUser(db, "davi");

		expect(anaClasses.map((c) => c.subject)).toEqual(["Big Data"]);
		expect(daviClasses.map((c) => c.subject)).toEqual(["Redes"]);
		expect(db.classSessionsStore).toHaveLength(2);
	});

	it("alunos da mesma turma do Classroom compartilham a aula, cada um com a sua matrícula", async () => {
		const fetcher = vi.fn().mockResolvedValue([course("gc-1", "Big Data", "Slides BD")]);

		await syncClassroomForUser({ db, userId: "ana", refreshToken: "t", fetcher });
		await syncClassroomForUser({ db, userId: "davi", refreshToken: "t", fetcher });

		expect(db.classSessionsStore).toHaveLength(1);
		expect(db.enrollmentsStore).toHaveLength(2);
		expect(await listClassesForUser(db, "ana")).toHaveLength(1);
		expect(await listClassesForUser(db, "davi")).toHaveLength(1);
	});

	it("repetir a sincronização não duplica a matrícula", async () => {
		const fetcher = vi.fn().mockResolvedValue([course("gc-1", "Big Data", "Slides BD")]);

		await syncClassroomForUser({ db, userId: "ana", refreshToken: "t", fetcher });
		await syncClassroomForUser({ db, userId: "ana", refreshToken: "t", fetcher });

		expect(db.enrollmentsStore).toHaveLength(1);
	});

	it("turmas diferentes com o mesmo nome continuam sendo aulas separadas", async () => {
		await syncClassroomForUser({
			db,
			userId: "ana",
			refreshToken: "t",
			fetcher: vi.fn().mockResolvedValue([course("gc-1", "Big Data", "Slides A")]),
		});
		await syncClassroomForUser({
			db,
			userId: "davi",
			refreshToken: "t",
			fetcher: vi.fn().mockResolvedValue([course("gc-9", "Big Data", "Slides B")]),
		});

		expect(db.classSessionsStore).toHaveLength(2);
		expect(await listClassesForUser(db, "ana")).toHaveLength(1);
		expect(await listClassesForUser(db, "davi")).toHaveLength(1);
	});

	it("aluno logado sem turmas reais não ganha aulas fictícias nem grava nada", async () => {
		const result = await syncClassroomForUser({
			db,
			userId: "ana",
			refreshToken: "t",
			fetcher: vi.fn().mockRejectedValue(new Error("insufficient scopes")),
		});

		expect(result.usedFallbackSeed).toBe(true);
		expect(result.syncedCourses).toBe(0);
		expect(db.classSessionsStore).toHaveLength(0);
		expect(db.enrollmentsStore).toHaveLength(0);
	});

	it("filtra por semestre dentro das aulas do aluno", async () => {
		await syncClassroomForUser({
			db,
			userId: "ana",
			refreshToken: "t",
			fetcher: vi.fn().mockResolvedValue([
				course("gc-1", "Big Data", "A"),
				{ ...course("gc-2", "Redes", "B"), semester: "2026.1" },
			]),
		});

		expect(await listClassesForUser(db, "ana", "2026.1")).toHaveLength(1);
		expect(await listClassesForUser(db, "ana", "todos")).toHaveLength(2);
	});

	describe("rotas", () => {
		it("exigem login para listar, abrir, notificar e sincronizar", async () => {
			const anon = callerFor(null);
			await expect(anon.class.list()).rejects.toThrow("Usuário não autenticado");
			await expect(anon.class.byId({ id: "x" })).rejects.toThrow(
				"Usuário não autenticado",
			);
			await expect(anon.class.notifications()).rejects.toThrow(
				"Usuário não autenticado",
			);
			await expect(anon.class.syncFromClassroom()).rejects.toThrow(
				"Usuário não autenticado",
			);
		});

		it("list, byId e notifications mostram só o que é do aluno logado", async () => {
			await syncClassroomForUser({
				db,
				userId: "ana",
				refreshToken: "t",
				fetcher: vi.fn().mockResolvedValue([course("gc-1", "Big Data", "Slides BD")]),
			});
			await syncClassroomForUser({
				db,
				userId: "davi",
				refreshToken: "t",
				fetcher: vi.fn().mockResolvedValue([course("gc-2", "Redes", "Slides Redes")]),
			});
			const anaClass = (await listClassesForUser(db, "ana"))[0]!;
			const daviClass = (await listClassesForUser(db, "davi"))[0]!;

			const ana = callerFor("ana");
			expect((await ana.class.list()).map((c) => c.subject)).toEqual(["Big Data"]);
			expect((await ana.class.byId({ id: anaClass.id })).materials).toHaveLength(1);
			await expect(ana.class.byId({ id: daviClass.id })).rejects.toThrow(
				"Class session not found",
			);

			const notifications = await ana.class.notifications();
			expect(notifications).toHaveLength(1);
			expect(notifications[0]?.classSessionId).toBe(anaClass.id);
		});

		it("sincronizar sem turmas reais devolve lista vazia, sem expor aulas de outros", async () => {
			await syncClassroomForUser({
				db,
				userId: "davi",
				refreshToken: "t",
				fetcher: vi.fn().mockResolvedValue([course("gc-2", "Redes", "Slides Redes")]),
			});

			const result = await callerFor("ana").class.syncFromClassroom();

			expect(result.usedFallbackSeed).toBe(true);
			expect(result.courses).toEqual([]);
			expect(db.classSessionsStore).toHaveLength(1);
		});
	});

	it("enrollUserInClasses sem aulas não faz nada", async () => {
		await enrollUserInClasses(db, "ana", []);
		expect(db.enrollmentsStore).toHaveLength(0);
	});
});
