import { eq } from "drizzle-orm";
import { classSessions, courseMaterials } from "../../db/schema/index.js";
import type { ContextRetriever } from "./ports.js";

/**
 * Implementação v1: usa o metadado já sincronizado do Classroom
 * (`course_materials.summary` + `class_sessions.topics`) como contexto.
 *
 * Quando a task de Ingestão existir, uma segunda implementação desta mesma
 * interface vai buscar `material_chunks` por similaridade — o resto do
 * pipeline de geração não precisa mudar.
 */
export function createClassroomMetadataContextRetriever(
	db: any,
): ContextRetriever {
	return {
		async getContext(classSessionId) {
			const [session] = await db
				.select()
				.from(classSessions)
				.where(eq(classSessions.id, classSessionId));

			const materials = await db
				.select()
				.from(courseMaterials)
				.where(eq(courseMaterials.classSessionId, classSessionId));

			const topics: string[] = session?.topics ?? [];

			const context: string[] = [];
			if (topics.length > 0) {
				context.push(`Tópicos da aula: ${topics.join(", ")}.`);
			}

			for (const material of materials) {
				if (material.summary) {
					context.push(`[${material.title}] ${material.summary}`);
				}
			}

			return context;
		},
	};
}
