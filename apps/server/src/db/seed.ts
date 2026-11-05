import "dotenv/config";
import { db, pool } from "./index.js";
import { syncClassroomForUser } from "../services/classroom.service.js";

export async function runSeed(database: any = db) {
	return syncClassroomForUser({
		db: database,
		refreshToken: null,
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	runSeed()
		.then((res) => {
			console.log(
				`[seed] Sincronizadas ${res.syncedCourses} turmas e ${res.syncedMaterials} materiais da UCSAL.`,
			);
			return pool.end();
		})
		.catch((err) => {
			console.error("[seed] Falha ao executar seed:", err);
			process.exit(1);
		});
}
