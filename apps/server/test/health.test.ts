import { describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";

describe("Health check", () => {
	it("GET / returns status ok", async () => {
		const server = await buildServer();

		const response = await server.inject({
			method: "GET",
			url: "/",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(expect.objectContaining({ status: "ok" }));

		await server.close();
	});

	it("GET /trpc/health.check returns healthy", async () => {
		const server = await buildServer();

		const response = await server.inject({
			method: "GET",
			url: "/trpc/health.check",
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.result.data.status).toBe("healthy");
		expect(body.result.data.timestamp).toBeDefined();

		await server.close();
	});
});
