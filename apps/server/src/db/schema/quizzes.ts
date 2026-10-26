import {
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { classSessions, difficultyEnum } from "./class-sessions.js";
import { users } from "./users.js";

export const quizzes = pgTable("quizzes", {
	id: uuid("id").primaryKey().defaultRandom(),
	classSessionId: uuid("class_session_id")
		.notNull()
		.references(() => classSessions.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	difficulty: difficultyEnum("difficulty").notNull().default("medio"),
	questionsJson: jsonb("questions_json").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const quizAttempts = pgTable("quiz_attempts", {
	id: uuid("id").primaryKey().defaultRandom(),
	quizId: uuid("quiz_id")
		.notNull()
		.references(() => quizzes.id, { onDelete: "cascade" }),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	score: numeric("score", { precision: 5, scale: 2 }).notNull(),
	answersJson: jsonb("answers_json").notNull(),
	timeSpentSeconds: integer("time_spent_seconds").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type NewQuizAttempt = typeof quizAttempts.$inferInsert;
