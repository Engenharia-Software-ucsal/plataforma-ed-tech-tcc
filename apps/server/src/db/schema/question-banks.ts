import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { classSessions } from "./class-sessions.js";
import { courseMaterials } from "./course-materials.js";

/**
 * Banco de perguntas geradas pela IA para um escopo: a aula inteira
 * (`courseMaterialId` nulo) ou um único documento. Cada quiz sorteia daqui.
 */
export const questionBanks = pgTable(
	"question_banks",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		classSessionId: uuid("class_session_id")
			.notNull()
			.references(() => classSessions.id, { onDelete: "cascade" }),
		courseMaterialId: uuid("course_material_id").references(
			() => courseMaterials.id,
			{ onDelete: "cascade" },
		),
		// "provedor:modelo" que gerou as perguntas, ou "sample" para o gerador de exemplo.
		generator: text("generator").notNull(),
		questionsJson: jsonb("questions_json").notNull(),
		// Data de leitura do PDF mais recente já usado; PDFs lidos depois geram perguntas novas.
		sourceIngestedAt: timestamp("source_ingested_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("question_banks_class_session_id_idx").on(table.classSessionId),
	],
);

export type QuestionBank = typeof questionBanks.$inferSelect;
export type NewQuestionBank = typeof questionBanks.$inferInsert;
