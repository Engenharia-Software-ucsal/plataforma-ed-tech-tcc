import { describe, expect, it, vi } from "vitest";
import { authenticateWithGoogle } from "../src/services/auth.service.js";

// @ts-expect-error
globalThis.__mockGetPayload = vi.fn();

vi.mock("google-auth-library", () => {
	return {
		OAuth2Client: vi.fn().mockImplementation(() => {
			return {
				getToken: vi.fn().mockResolvedValue({
					tokens: { id_token: "mock_id_token", refresh_token: "mock_refresh" },
				}),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => globalThis.__mockGetPayload(),
				}),
			};
		}),
	};
});

// Mock database to prevent actual inserts during logic test
vi.mock("../src/db/index.js", () => {
	return {
		db: {
			query: {
				users: {
					findFirst: vi.fn().mockResolvedValue(null),
				},
			},
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([{ id: "mock_user_id" }]),
				}),
			}),
		},
	};
});

describe("authenticateWithGoogle domain restrictions", () => {
	it("should throw UNAUTHORIZED_DOMAIN if email does not end with @ucsal.edu.br", async () => {
		// @ts-expect-error
		globalThis.__mockGetPayload.mockReturnValue({
			email: "student@gmail.com",
			sub: "12345",
			name: "Student",
			picture: "pic.jpg",
		});

		await expect(authenticateWithGoogle("auth_code")).rejects.toThrow(
			"UNAUTHORIZED_DOMAIN",
		);
	});

	it("should proceed if email ends with @ucsal.edu.br", async () => {
		// @ts-expect-error
		globalThis.__mockGetPayload.mockReturnValue({
			email: "student@ucsal.edu.br",
			sub: "12345",
			name: "Student",
			picture: "pic.jpg",
		});

		const result = await authenticateWithGoogle("auth_code");
		expect(result).toHaveProperty("sessionId");
		expect(result.user).toBeDefined();
	});
});
