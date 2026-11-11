import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";
import { users } from "./users.js";

export const classEnrollments = pgTable(
	"class_enrollments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		classSessionId: uuid("class_session_id")
			.notNull()
			.references(() => classSessions.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [unique().on(table.userId, table.classSessionId)],
);

export type ClassEnrollment = typeof classEnrollments.$inferSelect;
export type NewClassEnrollment = typeof classEnrollments.$inferInsert;
