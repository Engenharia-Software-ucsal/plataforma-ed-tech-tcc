import crypto from "node:crypto";
import { env } from "@busuucsal-v3/env/server";
import { eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/index.js";
import { sessions, users } from "../db/schema/index.js";

const client = new OAuth2Client(
	env.GOOGLE_SERVER_CLIENT_ID,
	env.GOOGLE_CLIENT_SECRET,
	"postmessage",
);

export async function authenticateWithGoogle(code: string) {
	const { tokens } = await client.getToken(code);
	const ticket = await client.verifyIdToken({
		idToken: tokens.id_token!,
		audience: env.GOOGLE_SERVER_CLIENT_ID,
	});
	const payload = ticket.getPayload()!;

	if (!payload.email?.endsWith("@ucsal.edu.br")) {
		throw new Error("UNAUTHORIZED_DOMAIN");
	}

	let user = await db.query.users.findFirst({
		where: eq(users.googleId, payload.sub!),
	});

	if (!user) {
		const [newUser] = await db
			.insert(users)
			.values({
				name: payload.name!,
				email: payload.email!,
				avatarUrl: payload.picture,
				googleId: payload.sub,
				googleRefreshToken: tokens.refresh_token,
			})
			.returning();
		if (!newUser) throw new Error("Failed to create user");
		user = newUser;
	} else if (tokens.refresh_token) {
		await db
			.update(users)
			.set({ googleRefreshToken: tokens.refresh_token })
			.where(eq(users.id, user.id));
	}

	const sessionId = crypto.randomBytes(32).toString("hex");
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30);

	await db.insert(sessions).values({
		id: sessionId,
		userId: user.id,
		expiresAt,
	});

	return { sessionId, user };
}

export async function validateSession(sessionId: string) {
	const result = await db
		.select({
			session: sessions,
			user: users,
		})
		.from(sessions)
		.leftJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	const row = result[0];
	if (!row) return null;
	const { session, user } = row;
	if (!session || session.expiresAt < new Date()) return null;
	return user;
}
