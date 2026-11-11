import {
	index,
	integer,
	pgTable,
	real,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { courseMaterials } from "./course-materials.js";

export const materialChunks = pgTable(
	"material_chunks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		courseMaterialId: uuid("course_material_id")
			.notNull()
			.references(() => courseMaterials.id, { onDelete: "cascade" }),
		chunkIndex: integer("chunk_index").notNull(),
		content: text("content").notNull(),
		embedding: real("embedding").array().notNull(),
		// "provedor:modelo:dimensões": vetores de modelos diferentes não são comparáveis.
		embeddingModel: text("embedding_model").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index("material_chunks_course_material_id_idx").on(table.courseMaterialId)],
);

export type MaterialChunk = typeof materialChunks.$inferSelect;
export type NewMaterialChunk = typeof materialChunks.$inferInsert;
