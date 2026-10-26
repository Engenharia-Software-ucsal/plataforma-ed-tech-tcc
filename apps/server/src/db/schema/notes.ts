import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";
import { users } from "./users.js";

export const notes = pgTable("notes", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	classSessionId: uuid("class_session_id").references(
		() => classSessions.id,
		{ onDelete: "set null" },
	),
	title: text("title").notNull(),
	content: text("content").notNull(),
	tags: text("tags").array().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
