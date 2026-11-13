import {
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { notes } from "./notes.js";

/**
 * Vínculos entre notas.
 * - `wikilink`: gerado a partir dos `[[links]]` do texto a cada salvamento; o
 *   texto é a fonte da verdade, então não tem justificativa (`reason` nulo).
 * - `manual` / `ai_suggested`: vínculos semânticos com justificativa obrigatória.
 */
export const NOTE_LINK_TYPES = ["manual", "ai_suggested", "wikilink"] as const;
export type NoteLinkType = (typeof NOTE_LINK_TYPES)[number];

export const noteLinks = pgTable(
	"note_links",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		sourceNoteId: uuid("source_note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		targetNoteId: uuid("target_note_id")
			.notNull()
			.references(() => notes.id, { onDelete: "cascade" }),
		similarityScore: numeric("similarity_score", {
			precision: 3,
			scale: 2,
		}).default("1.00"),
		linkType: text("link_type")
			.$type<NoteLinkType>()
			.notNull()
			.default("manual"),
		reason: text("reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("note_links_source_target_type_idx").on(
			table.sourceNoteId,
			table.targetNoteId,
			table.linkType,
		),
		index("note_links_target_note_id_idx").on(table.targetNoteId),
	],
);

export type NoteLink = typeof noteLinks.$inferSelect;
export type NewNoteLink = typeof noteLinks.$inferInsert;
