import crypto from "node:crypto";
import {
	classEnrollments,
	classSessions,
	courseMaterials,
	materialChunks,
	questionBanks,
	quizAttempts,
	quizzes,
} from "../../src/db/schema/index.js";
import { matchesCondition as matchesWith } from "./mock-conditions.js";

const columnToProp: Record<string, string> = {
	id: "id",
	google_course_id: "googleCourseId",
	google_material_id: "googleMaterialId",
	class_session_id: "classSessionId",
	user_id: "userId",
	course_material_id: "courseMaterialId",
	semester: "semester",
	subject: "subject",
	title: "title",
};

function matchesCondition(item: any, cond: any): boolean {
	return matchesWith(item, cond, columnToProp);
}

export function createClassroomMockDatabase() {
	const classSessionsStore: any[] = [];
	const materialsStore: any[] = [];
	const enrollmentsStore: any[] = [];
	const chunksStore: any[] = [];
	const quizzesStore: any[] = [];
	const banksStore: any[] = [];
	const attemptsStore: any[] = [];

	function getStore(table: any) {
		if (table === quizzes) return quizzesStore;
		if (table === questionBanks) return banksStore;
		if (table === quizAttempts) return attemptsStore;
		if (table === classSessions) return classSessionsStore;
		if (table === courseMaterials) return materialsStore;
		if (table === classEnrollments) return enrollmentsStore;
		if (table === materialChunks) return chunksStore;
		return classSessionsStore;
	}

	const db: any = {
		classSessionsStore,
		materialsStore,
		enrollmentsStore,
		chunksStore,
		quizzesStore,
		banksStore,
		attemptsStore,
		transaction: async (fn: (tx: any) => Promise<unknown>) => fn(db),
		delete: (table: any) => ({
			where: async (cond: any) => {
				const store = getStore(table);
				for (let i = store.length - 1; i >= 0; i--) {
					if (matchesCondition(store[i], cond)) store.splice(i, 1);
				}
			},
		}),
		insert: (table: any) => ({
			values: (data: any) => {
				const rows = Array.isArray(data) ? data : [data];
				const store = getStore(table);
				const push = (skipDuplicates: boolean) =>
					rows.flatMap((row) => {
						const duplicate =
							skipDuplicates &&
							store.some(
								(e) =>
									e.userId === row.userId &&
									e.classSessionId === row.classSessionId,
							);
						if (duplicate) return [];
						const item = {
							id: row.id ?? crypto.randomUUID(),
							topics: row.topics ?? [],
							createdAt: new Date(),
							updatedAt: new Date(),
							...row,
						};
						store.push(item);
						return [item];
					});
				return {
					returning: async () => push(false),
					onConflictDoNothing: async () => {
						push(true);
					},
					// Como no Drizzle, `await insert().values()` também executa o insert.
					then: (resolve: any, reject: any) => {
						push(false);
						return Promise.resolve().then(resolve, reject);
					},
				};
			},
		}),
		select: () => ({
			from: (table: any) => {
				const store = getStore(table);
				const basePromise: any = Promise.resolve([...store]);
				basePromise.where = (cond: any) => {
					const filtered = store.filter((item) => matchesCondition(item, cond));
					const p: any = Promise.resolve(filtered);
					p.orderBy = () => {
						const ordered: any = Promise.resolve(filtered);
						// Todo orderBy com limit do servidor é por data de criação, do mais novo para o mais antigo.
						ordered.limit = async (n: number) =>
							[...filtered]
								.sort(
									(a, b) =>
										(b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0),
								)
								.slice(0, n);
						return ordered;
					};
					return p;
				};
				basePromise.orderBy = () => Promise.resolve([...store]);
				return basePromise;
			},
		}),
		update: (table: any) => ({
			set: (data: any) => ({
				where: (cond: any) => {
					const store = getStore(table);
					const index = store.findIndex((item) => matchesCondition(item, cond));
					let updated: any[] = [];
					if (index !== -1) {
						store[index] = {
							...store[index],
							...data,
							updatedAt: data.updatedAt ?? new Date(),
						};
						updated = [store[index]];
					}
					const result: any = Promise.resolve(updated);
					result.returning = async () => updated;
					return result;
				},
			}),
		}),
	};
	return db;
}
