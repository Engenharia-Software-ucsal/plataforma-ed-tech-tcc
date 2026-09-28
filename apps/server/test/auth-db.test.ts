import { describe, it, expect } from "vitest";
import { users } from "../src/db/schema/users.js";
import { sessions } from "../src/db/schema/sessions.js";

describe("Auth Database Schema", () => {
	it("should have googleId and googleRefreshToken in users", () => {
		expect(users.googleId).toBeDefined();
		expect(users.googleRefreshToken).toBeDefined();
	});

	it("should define sessions table with correct fields", () => {
		expect(sessions.id).toBeDefined();
		expect(sessions.userId).toBeDefined();
		expect(sessions.expiresAt).toBeDefined();
	});
});
