import type { FastifyBaseLogger } from "fastify";
import type { Executor } from "./db.js";
import { purgeExpiredTrash } from "./trash.service.js";

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Remove de vez o que está há mais de 30 dias na lixeira: uma vez ao subir o
 * servidor e depois a cada 6 horas. Roda dentro do processo do Fastify (não
 * há cron no projeto); se o servidor ficar parado, a limpeza só atrasa.
 * Devolve uma função que para o agendamento.
 */
export function scheduleTrashPurge(
	db: Executor,
	log: FastifyBaseLogger,
): () => void {
	const run = async () => {
		try {
			const purged = await purgeExpiredTrash(db);
			if (purged.notes > 0 || purged.folders > 0) {
				log.info(purged, "Lixeira: itens expirados removidos");
			}
		} catch (error) {
			log.error(error, "Lixeira: falha ao remover itens expirados");
		}
	};
	void run();
	const timer = setInterval(run, PURGE_INTERVAL_MS);
	timer.unref();
	return () => clearInterval(timer);
}
