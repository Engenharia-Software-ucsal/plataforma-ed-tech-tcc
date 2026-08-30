import "dotenv/config";
import Fastify from "fastify";
import { env } from "@busuucsal-v3/env/server";

const server = Fastify({ logger: true });

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
