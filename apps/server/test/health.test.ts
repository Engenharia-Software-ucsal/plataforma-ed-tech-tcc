import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";

describe("Health check", () => {
	let server: FastifyInstance;

	beforeAll(async () => {
		server = await buildServer();
	});

	afterAll(async () => {
		await server.close();
	});

	it("GET / returns status ok", async () => {
		const response = await server.inject({
			method: "GET",
			url: "/",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(expect.objectContaining({ status: "ok" }));
	});

	it("GET /trpc/health.check returns healthy", async () => {
		const response = await server.inject({
			method: "GET",
			url: "/trpc/health.check",
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.result.data.status).toBe("healthy");
		expect(body.result.data.timestamp).toBeDefined();
	});
});
