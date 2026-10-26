import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { notes } from "./notes.js";

export const noteLinks = pgTable("note_links", {
	id: uuid("id").primaryKey().defaultRandom(),
	sourceNoteId: uuid("source_note_id")
		.notNull()
		.references(() => notes.id, { onDelete: "cascade" }),
	targetNoteId: uuid("target_note_id")
		.notNull()
		.references(() => notes.id, { onDelete: "cascade" }),
	similarityScore: numeric("similarity_score", { precision: 3, scale: 2 }).default(
		"1.00",
	),
	linkType: text("link_type").notNull().default("manual"),
	reason: text("reason").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;
