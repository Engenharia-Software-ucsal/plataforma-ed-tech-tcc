import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";

export const courseMaterials = pgTable("course_materials", {
	id: uuid("id").primaryKey().defaultRandom(),
	classSessionId: uuid("class_session_id")
		.notNull()
		.references(() => classSessions.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	fileUrl: text("file_url").notNull(),
	materialType: text("material_type").notNull().default("pdf"),
	summary: text("summary"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type CourseMaterial = typeof courseMaterials.$inferSelect;
export type NewCourseMaterial = typeof courseMaterials.$inferInsert;
