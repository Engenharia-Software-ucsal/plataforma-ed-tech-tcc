import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		env: {
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/test",
			GOOGLE_SERVER_CLIENT_ID: "mock-id",
			GOOGLE_CLIENT_SECRET: "mock-secret",
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "lcov"],
		},
	},
});
