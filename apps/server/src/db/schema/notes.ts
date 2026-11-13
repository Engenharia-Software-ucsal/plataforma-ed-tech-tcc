import { sql } from "drizzle-orm";
import {
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";
import { folders } from "./folders.js";
import { users } from "./users.js";

export const notes = pgTable(
	"notes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		classSessionId: uuid("class_session_id").references(
			() => classSessions.id,
			{ onDelete: "set null" },
		),
		// Nulo = raiz.
		folderId: uuid("folder_id").references(() => folders.id, {
			onDelete: "set null",
		}),
		position: integer("position").notNull().default(0),
		title: text("title").notNull(),
		content: text("content").notNull(),
		// Tags do aluno.
		tags: text("tags").array().notNull().default([]),
		// Tags do sistema: hoje, a matéria da aula vinculada (`classSessionId`), em slug.
		autoTags: text("auto_tags").array().notNull().default([]),
		// Preenchido = na lixeira. Ver folders.ts sobre `deleteBatch`.
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		deleteBatch: uuid("delete_batch"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("notes_user_id_idx").on(table.userId),
		index("notes_folder_id_idx").on(table.folderId),
		// `[[Título]]` resolve por título: ele não pode repetir entre as notas ativas do aluno.
		uniqueIndex("notes_user_title_active_idx")
			.on(table.userId, sql`lower(${table.title})`)
			.where(sql`${table.deletedAt} is null`),
	],
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
