import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

/**
 * Pastas das notas de um aluno. `parentId` nulo = raiz.
 *
 * Lixeira: `deletedAt` preenchido = na lixeira. Excluir uma pasta marca ela e
 * tudo o que está dentro com o mesmo `deleteBatch`, para restaurar junto.
 * Ver docs/superpowers/specs/2026-11-08-markdown-notes-editor-design.md §4.3.1
 */
export const folders = pgTable(
	"folders",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		// Ao excluir definitivamente a pasta-pai, as filhas (já na lixeira) vão para a raiz da lixeira.
		parentId: uuid("parent_id").references((): AnyPgColumn => folders.id, {
			onDelete: "set null",
		}),
		name: text("name").notNull(),
		position: integer("position").notNull().default(0),
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
		index("folders_user_id_idx").on(table.userId),
		index("folders_parent_id_idx").on(table.parentId),
		// Nome único entre as pastas ativas irmãs. O coalesce trata a raiz (parent nulo) como um pai só.
		uniqueIndex("folders_user_parent_name_active_idx")
			.on(
				table.userId,
				sql`coalesce(${table.parentId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
				sql`lower(${table.name})`,
			)
			.where(sql`${table.deletedAt} is null`),
	],
);

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
