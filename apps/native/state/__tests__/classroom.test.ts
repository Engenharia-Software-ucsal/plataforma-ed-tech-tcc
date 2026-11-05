import { createStore } from "jotai";
import {
	availableSemestersAtom,
	classDetailsMapAtom,
	classroomNotificationsAtom,
	classSessionsAtom,
	filteredClassSessionsAtom,
	lastSyncedAtAtom,
	selectedSemesterAtom,
	syncClassroomAtomAction,
	syncStatusAtom,
	updateClassScheduleAtomAction,
} from "@/state/classroom";
import { trpc } from "@/utils/trpc";

describe("Classroom Jotai State", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it("initializes with 7 UCSAL courses across 2026.2 and 2026.1 and Classroom notifications without any bus items", () => {
		const store = createStore();
		const sessions = store.get(classSessionsAtom);
		const notifications = store.get(classroomNotificationsAtom);

		expect(sessions).toHaveLength(7);
		expect(sessions.filter((s) => s.semester === "2026.2")).toHaveLength(5);
		expect(sessions.filter((s) => s.semester === "2026.1")).toHaveLength(2);
		expect(sessions[0].subject).toBe("Engenharia de Software");

		expect(store.get(availableSemestersAtom)).toEqual(["2026.2", "2026.1"]);
		expect(store.get(selectedSemesterAtom)).toBe("2026.2");
		expect(store.get(filteredClassSessionsAtom)).toHaveLength(5);

		store.set(selectedSemesterAtom, "2026.1");
		expect(store.get(filteredClassSessionsAtom)).toHaveLength(2);
		expect(store.get(filteredClassSessionsAtom)[0].subject).toBe(
			"Estrutura de Dados",
		);

		store.set(selectedSemesterAtom, "todos");
		expect(store.get(filteredClassSessionsAtom)).toHaveLength(7);

		expect(notifications.some((n) => /ônibus/i.test(n.title))).toBe(false);
		expect(
			notifications.some((n) => n.title === "Novo aviso no Classroom"),
		).toBe(true);
		expect(
			notifications.some((n) => n.title === "Nova atividade no Classroom"),
		).toBe(true);
	});

	it("syncs with Classroom via syncClassroomAtomAction and updates syncStatus and lastSyncedAt", async () => {
		const store = createStore();
		const syncSpy = jest
			.spyOn(trpc.class.syncFromClassroom, "mutate")
			.mockResolvedValueOnce({
				syncedCourses: 1,
				syncedMaterials: 1,
				usedFallbackSeed: false,
				syncedAt: "2026-11-04T22:00:00.000Z",
				courses: [
					{
						id: "class-eng-sw",
						subject: "Engenharia de Software",
						professor: "Prof. Ana Silva",
						startTime: "08:00",
						endTime: "09:30",
						room: "Sala 302 · BL-A-302",
						topics: ["SOLID", "Clean Architecture"],
						materials: [
							{
								id: "mat-1",
								title: "Slides Clean Architecture.pdf",
								fileUrl: "https://classroom.google.com/c/1/m/1",
								materialType: "pdf",
							},
						],
					},
				],
			});

		await store.set(syncClassroomAtomAction);

		expect(syncSpy).toHaveBeenCalledTimes(1);
		expect(store.get(syncStatusAtom)).toBe("synced");
		expect(store.get(lastSyncedAtAtom)).toBe(
			"Sincronizado com Classroom agora",
		);
		const details = store.get(classDetailsMapAtom)["class-eng-sw"];
		expect(details.topics).toEqual(["SOLID", "Clean Architecture"]);
		expect(details.files[0].name).toBe("Slides Clean Architecture.pdf");
	});

	it("updates schedule and room locally and calls trpc.class.updateSchedule.mutate", async () => {
		const store = createStore();
		const updateSpy = jest.spyOn(trpc.class.updateSchedule, "mutate");

		await store.set(updateClassScheduleAtomAction, {
			id: "class-bd2",
			startTime: "18:30",
			endTime: "21:10",
			room: "Lab 305 · Bloco B",
		});

		expect(updateSpy).toHaveBeenCalledWith({
			id: "class-bd2",
			startTime: "18:30",
			endTime: "21:10",
			room: "Lab 305 · Bloco B",
		});

		const updatedSession = store
			.get(classSessionsAtom)
			.find((s) => s.id === "class-bd2");
		expect(updatedSession?.startTime).toBe("18:30");
		expect(updatedSession?.endTime).toBe("21:10");
		expect(updatedSession?.room).toBe("Lab 305 · Bloco B");

		const updatedDetails = store.get(classDetailsMapAtom)["class-bd2"];
		expect(updatedDetails.schedule).toBe("18:30 - 21:10");
		expect(updatedDetails.room).toBe("Lab 305 · Bloco B");
	});
});
