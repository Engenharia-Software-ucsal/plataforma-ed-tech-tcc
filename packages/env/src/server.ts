import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().url(),
		PORT: z
			.string()
			.default("3000")
			.transform((v) => Number.parseInt(v, 10)),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		GOOGLE_SERVER_CLIENT_ID: z.string().min(1),
		GOOGLE_CLIENT_SECRET: z.string().min(1),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
