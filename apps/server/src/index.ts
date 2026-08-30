import "dotenv/config";
import { env } from "@busuucsal-v3/env/server";
import {
	type FastifyTRPCPluginOptions,
	fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import Fastify from "fastify";
import { createContext } from "./trpc/context.js";
import { type AppRouter, appRouter } from "./trpc/router.js";

const server = Fastify({
	logger: true,
	routerOptions: {
		maxParamLength: 5000,
	},
});

server.register(fastifyTRPCPlugin, {
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

const start = async () => {
	try {
		await server.listen({ port: env.PORT, host: "0.0.0.0" });
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
