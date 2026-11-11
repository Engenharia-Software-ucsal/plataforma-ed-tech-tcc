import {
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";

export const ingestionStatusEnum = pgEnum("ingestion_status", [
	"pending",
	"processing",
	"ready",
	"failed",
	"unsupported",
]);

export const courseMaterials = pgTable("course_materials", {
	id: uuid("id").primaryKey().defaultRandom(),
	googleMaterialId: varchar("google_material_id", { length: 255 }).unique(),
	classSessionId: uuid("class_session_id")
		.notNull()
		.references(() => classSessions.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	fileUrl: text("file_url").notNull(),
	materialType: text("material_type").notNull().default("pdf"),
	summary: text("summary"),
	ingestionStatus: ingestionStatusEnum("ingestion_status")
		.notNull()
		.default("pending"),
	ingestionError: text("ingestion_error"),
	ingestedAt: timestamp("ingested_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type CourseMaterial = typeof courseMaterials.$inferSelect;
export type NewCourseMaterial = typeof courseMaterials.$inferInsert;
