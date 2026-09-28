import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "../db/index.js";
import { validateSession } from "../services/auth.service.js";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
	const authHeader = req.headers.authorization;
	let user = null;

	if (authHeader && authHeader.startsWith("Bearer ")) {
		const sessionId = authHeader.split(" ")[1];
		if (sessionId) {
			user = await validateSession(sessionId);
		}
	}

	return { req, res, db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
