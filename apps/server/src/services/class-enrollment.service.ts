import { eq, inArray } from "drizzle-orm";
import {
	classEnrollments,
	classSessions,
	courseMaterials,
} from "../db/schema/index.js";

/** Matricula o aluno nas aulas; repetir a chamada não duplica. */
export async function enrollUserInClasses(
	db: any,
	userId: string,
	classSessionIds: string[],
): Promise<void> {
	if (classSessionIds.length === 0) return;
	await db
		.insert(classEnrollments)
		.values(classSessionIds.map((classSessionId) => ({ userId, classSessionId })))
		.onConflictDoNothing();
}

async function listEnrolledClassIds(db: any, userId: string): Promise<string[]> {
	const rows: Array<typeof classEnrollments.$inferSelect> = await db
		.select()
		.from(classEnrollments)
		.where(eq(classEnrollments.userId, userId));
	return rows.map((row) => row.classSessionId);
}

/** Aulas em que o aluno está matriculado, opcionalmente de um semestre. */
export async function listClassesForUser(
	db: any,
	userId: string,
	semester?: string,
): Promise<Array<typeof classSessions.$inferSelect>> {
	const classIds = await listEnrolledClassIds(db, userId);
	if (classIds.length === 0) return [];

	const sessions: Array<typeof classSessions.$inferSelect> = await db
		.select()
		.from(classSessions)
		.where(inArray(classSessions.id, classIds))
		.orderBy(classSessions.startTime);

	return semester && semester !== "todos"
		? sessions.filter((session) => session.semester === semester)
		: sessions;
}

export async function listMaterialsForClasses(
	db: any,
	classSessionIds: string[],
): Promise<Array<typeof courseMaterials.$inferSelect>> {
	if (classSessionIds.length === 0) return [];
	return db
		.select()
		.from(courseMaterials)
		.where(inArray(courseMaterials.classSessionId, classSessionIds));
}

export async function isUserEnrolled(
	db: any,
	userId: string,
	classSessionId: string,
): Promise<boolean> {
	const classIds = await listEnrolledClassIds(db, userId);
	return classIds.includes(classSessionId);
}
