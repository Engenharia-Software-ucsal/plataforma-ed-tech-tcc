import "dotenv/config";
import { env } from "@busuucsal-v3/env/server";
import cors from "@fastify/cors";
import {
	type FastifyTRPCPluginOptions,
	fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { pool } from "./db/index.js";
import { createContext } from "./trpc/context.js";
import { type AppRouter, appRouter } from "./trpc/router.js";

export async function buildServer() {
	const server = Fastify({
		logger: true,
		routerOptions: {
			maxParamLength: 5000,
		},
	});

	await server.register(cors, { origin: true });

	await server.register(fastifyTRPCPlugin, {
		prefix: "/trpc",
		trpcOptions: {
			router: appRouter,
			createContext,
			onError({ path, error }) {
				console.error(`Error in tRPC handler on path '${path}':`, error);
			},
		} satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
	});

	server.get("/", async () => {
		return { status: "ok", environment: env.NODE_ENV };
	});

	server.addHook("onClose", async () => {
		await pool.end();
	});

	return server;
}

const start = async () => {
	const server = await buildServer();
	try {
		await server.listen({ port: env.PORT, host: "0.0.0.0" });
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

if (process.env.NODE_ENV !== "test") {
	start();
}
