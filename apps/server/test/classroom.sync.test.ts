import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSeed } from "../src/db/seed.js";
import {
	fetchClassroomSnapshotWithToken,
	inferCourseSemester,
	parseClassroomScheduleAndRoom,
	syncClassroomForUser,
} from "../src/services/classroom.service.js";
import { enrollUserInClasses } from "../src/services/class-enrollment.service.js";
import { appRouter } from "../src/trpc/router.js";
import { createClassroomMockDatabase } from "./helpers/classroom-mock-db.js";

describe("Google Classroom Service & tRPC Integration", () => {
	let mockDb: ReturnType<typeof createClassroomMockDatabase>;

	beforeEach(() => {
		mockDb = createClassroomMockDatabase();
		vi.restoreAllMocks();
	});

	describe("parseClassroomScheduleAndRoom", () => {
		it("extracts HH:MM range and room from section and room fields", () => {
			expect(
				parseClassroomScheduleAndRoom("Matutino 08:00 - 09:30", "Sala 302 · Bloco A"),
			).toEqual({
				startTime: "08:00",
				endTime: "09:30",
				room: "Sala 302 · Bloco A",
			});

			expect(
				parseClassroomScheduleAndRoom("Noturno 18h30 às 21h10 · Lab 201", null),
			).toEqual({
				startTime: "18:30",
				endTime: "21:10",
				room: "Lab 201",
			});

			expect(parseClassroomScheduleAndRoom("18h - 20h", "Sala 108")).toEqual({
				startTime: "18:00",
				endTime: "20:00",
				room: "Sala 108",
			});
		});

		it("applies clean fallbacks when schedule or room is omitted", () => {
			expect(parseClassroomScheduleAndRoom(undefined, undefined)).toEqual({
				startTime: "08:00",
				endTime: "09:30",
				room: "Sala a definir · Classroom",
			});
		});
	});

	describe("inferCourseSemester", () => {
		it("extracts semester from course name, section, creationTime, or fallback", () => {
			expect(inferCourseSemester("Estrutura de Dados 2025.1", null, null)).toBe(
				"2025.1",
			);
			expect(
				inferCourseSemester("Engenharia de Software", "Turma 2026-2 · Matutino", null),
			).toBe("2026.2");
			expect(
				inferCourseSemester(
					"Arquitetura de Computadores",
					null,
					"2026-03-10T12:00:00Z",
				),
			).toBe("2026.1");
			expect(
				inferCourseSemester("Banco de Dados II", null, "2026-08-15T12:00:00Z"),
			).toBe("2026.2");
			expect(inferCourseSemester("Disciplina Sem Data", null, null)).toBe(
				"2026.2",
			);
		});
	});

	describe("fetchClassroomSnapshotWithToken", () => {
		it("fetches the 5 canonical scopes from Classroom REST v1 using OAuth2Client", async () => {
			vi.spyOn(OAuth2Client.prototype, "request").mockImplementation(
				async (opts: any) => {
					const url = String(opts.url);
					if (url.endsWith("/courses?courseStates=ACTIVE")) {
						return {
							data: {
								courses: [
									{
										id: "gc-course-1",
										name: "Arquitetura de Software",
										section: "08:00 - 09:30",
										room: "Sala 302 · BL-A",
									},
								],
							},
						} as any;
					}
					if (url.endsWith("/courses/gc-course-1/teachers")) {
						return {
							data: {
								teachers: [{ profile: { name: { fullName: "Prof. Ana Silva" } } }],
							},
						} as any;
					}
					if (url.endsWith("/courses/gc-course-1/topics")) {
						return {
							data: {
								topic: [
									{ topicId: "t1", name: "SOLID" },
									{ topicId: "t2", name: "Clean Architecture" },
								],
							},
						} as any;
					}
					if (url.endsWith("/courses/gc-course-1/courseWorkMaterials")) {
						return {
							data: {
								courseWorkMaterial: [
									{
										id: "m1",
										title: "Slides SOLID",
										description: "Material de aula sobre inversão de dependência",
										materials: [
											{
												driveFile: {
													driveFile: {
														id: "df1",
														title: "Slides - Aula 04.pdf",
														alternateLink: "https://drive.google.com/file/d/df1",
													},
												},
											},
											{
												youtubeVideo: {
													id: "yt1",
													title: "Aula Gravada SOLID.mp4",
													alternateLink: "https://youtube.com/watch?v=yt1",
												},
											},
											{
												link: {
													title: "Repositório GitHub",
													url: "https://github.com/ucsal/solid",
												},
											},
										],
									},
								],
							},
						} as any;
					}
					if (url.endsWith("/courses/gc-course-1/courseWork")) {
						return {
							data: {
								courseWork: [
									{
										id: "cw1",
										title: "Entrega: Refatoração SOLID",
										description: "Submeter link do repositório até sexta",
										alternateLink: "https://classroom.google.com/c/gc-course-1/a/cw1",
									},
								],
							},
						} as any;
					}
					if (url.endsWith("/courses/gc-course-1/announcements")) {
						return {
							data: {
								announcements: [
									{
										id: "ann1",
										text: "Lembrem-se de revisar o princípio de substituição de Liskov.",
										alternateLink: "https://classroom.google.com/c/gc-course-1/p/ann1",
									},
								],
							},
						} as any;
					}
					return { data: {} } as any;
				},
			);

			const snapshot = await fetchClassroomSnapshotWithToken("mock-refresh-token");
			expect(snapshot).toHaveLength(1);
			expect(snapshot[0]?.subject).toBe("Arquitetura de Software");
			expect(snapshot[0]?.professor).toBe("Prof. Ana Silva");
			expect(snapshot[0]?.topics).toEqual(["SOLID", "Clean Architecture"]);
			expect(snapshot[0]?.materials).toHaveLength(5);
			expect(snapshot[0]?.materials.map((m) => m.materialType)).toEqual([
				"pdf",
				"video",
				"link",
				"assignment",
				"announcement",
			]);
		});
	});

	describe("syncClassroomForUser & tRPC class router", () => {
		const mockUser = {
			id: crypto.randomUUID(),
			name: "João Estudante",
			email: "joao.estudante@ucsal.edu.br",
			avatarUrl: null,
			googleId: "g-123",
			googleRefreshToken: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		function studentCaller() {
			return appRouter.createCaller({
				db: mockDb as any,
				user: mockUser,
				req: {} as any,
				res: {} as any,
			});
		}

		it("upserts courses and materials idempotently when fetcher returns active courses", async () => {
			const customFetcher = vi.fn().mockResolvedValue([
				{
					googleCourseId: "gc-eng-sw",
					startTime: "08:00",
					endTime: "09:30",
					subject: "Engenharia de Software",
					professor: "Prof. Ana Silva",
					room: "Sala 302 · Bloco A",
					topics: ["SOLID", "Microsserviços"],
					difficultyLevel: "dificil" as const,
					difficultyScore: "4.3",
					difficultyReviewCount: 142,
					materials: [
						{
							googleMaterialId: "gm-1",
							title: "Slides - Aula 04.pdf",
							fileUrl: "https://classroom.google.com/m/gm-1",
							materialType: "pdf" as const,
							summary: "Slides da aula",
						},
						{
							googleMaterialId: "gm-ann-1",
							title: "Aviso: Prova na próxima semana",
							fileUrl: "https://classroom.google.com/p/gm-ann-1",
							materialType: "announcement" as const,
							summary: "Estudem os capítulos 3 e 4.",
						},
					],
				},
			]);

			const firstSync = await syncClassroomForUser({
				db: mockDb,
				refreshToken: "valid-token",
				fetcher: customFetcher,
			});

			expect(firstSync.usedFallbackSeed).toBe(false);
			expect(firstSync.syncedCourses).toBe(1);
			expect(firstSync.syncedMaterials).toBe(2);
			expect(mockDb.classSessionsStore).toHaveLength(1);
			expect(mockDb.materialsStore).toHaveLength(2);

			// Segunda execução para garantir idempotência (sem duplicação)
			const secondSync = await syncClassroomForUser({
				db: mockDb,
				refreshToken: "valid-token",
				fetcher: customFetcher,
			});

			expect(secondSync.usedFallbackSeed).toBe(false);
			expect(mockDb.classSessionsStore).toHaveLength(1);
			expect(mockDb.materialsStore).toHaveLength(2);
		});

		it("applies UCSAL fallback seed when there is no user (seed script) and exposes it only to enrolled students", async () => {
			const syncResult = await syncClassroomForUser({
				db: mockDb,
				refreshToken: null,
			});
			expect(syncResult.usedFallbackSeed).toBe(true);
			expect(syncResult.syncedCourses).toBe(7);
			expect(mockDb.classSessionsStore).toHaveLength(7);
			expect(mockDb.materialsStore.length).toBeGreaterThanOrEqual(6);
			expect(mockDb.enrollmentsStore).toHaveLength(0);

			const caller = studentCaller();
			expect(await caller.class.list()).toHaveLength(0);

			await enrollUserInClasses(
				mockDb,
				mockUser.id,
				mockDb.classSessionsStore.map((s) => s.id),
			);

			const list = await caller.class.list();
			expect(list).toHaveLength(7);

			const list20262 = await caller.class.list({ semester: "2026.2" });
			expect(list20262).toHaveLength(5);

			const list20261 = await caller.class.list({ semester: "2026.1" });
			expect(list20261).toHaveLength(2);

			const engSw = list.find((c) => c.subject === "Engenharia de Software");
			expect(engSw).toBeDefined();
			expect(engSw?.semester).toBe("2026.2");
			expect(engSw?.topics).toEqual(["SOLID", "Microsserviços", "Circuit Breaker"]);

			const details = await caller.class.byId({ id: engSw!.id });
			expect(details.subject).toBe("Engenharia de Software");
			expect(details.materials.length).toBeGreaterThanOrEqual(4);
		});

		it("updates schedule and room locally via class.updateSchedule and throws NOT_FOUND for invalid id", async () => {
			const caller = appRouter.createCaller({
				db: mockDb as any,
				user: null,
				req: {} as any,
				res: {} as any,
			});

			await syncClassroomForUser({ db: mockDb, refreshToken: null });
			const firstClass = mockDb.classSessionsStore[0];

			const updated = await caller.class.updateSchedule({
				id: firstClass!.id,
				startTime: "19:00",
				endTime: "21:40",
				room: "Lab 105 · Bloco B",
			});

			expect(updated.startTime).toBe("19:00");
			expect(updated.endTime).toBe("21:40");
			expect(updated.room).toBe("Lab 105 · Bloco B");

			await expect(
				caller.class.updateSchedule({
					id: "non-existent-id",
					startTime: "10:00",
					endTime: "11:30",
					room: "Sala 101",
				}),
			).rejects.toThrow("Class session not found");
		});

		it("returns academic notifications derived from synced materials, assignments, and announcements", async () => {
			const caller = studentCaller();

			const me = await caller.auth.me();
			expect(me?.email).toBe("joao.estudante@ucsal.edu.br");

			await syncClassroomForUser({ db: mockDb, refreshToken: null });
			await enrollUserInClasses(
				mockDb,
				mockUser.id,
				mockDb.classSessionsStore.map((s) => s.id),
			);
			const notifications = await caller.class.notifications();

			expect(notifications.length).toBeGreaterThan(0);
			expect(
				notifications.some((n) => n.materialType === "announcement"),
			).toBe(true);
			expect(
				notifications.some((n) => n.materialType === "assignment"),
			).toBe(true);
			expect(
				notifications.every(
					(n) => !n.title.toLowerCase().includes("ônibus"),
				),
			).toBe(true);

			const seedRes = await runSeed(mockDb);
			expect(seedRes.usedFallbackSeed).toBe(true);
			expect(seedRes.syncedCourses).toBe(7);
		});
	});
});
