import {
	integer,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty_level", [
	"facil",
	"medio",
	"dificil",
]);

export const classSessions = pgTable("class_sessions", {
	id: uuid("id").primaryKey().defaultRandom(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	subject: text("subject").notNull(),
	professor: text("professor").notNull(),
	room: text("room").notNull(),
	difficultyLevel: difficultyEnum("difficulty_level")
		.notNull()
		.default("medio"),
	difficultyScore: numeric("difficulty_score", { precision: 3, scale: 1 })
		.notNull()
		.default("0.0"),
	difficultyReviewCount: integer("difficulty_review_count")
		.notNull()
		.default(0),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type ClassSession = typeof classSessions.$inferSelect;
export type NewClassSession = typeof classSessions.$inferInsert;
