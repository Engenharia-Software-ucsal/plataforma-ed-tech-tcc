# Google Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement offline Google Sign-In, enforcing `@ucsal.edu.br` emails and creating stateful database sessions.

**Architecture:** Modifies Drizzle schema to support sessions and Google IDs. Adds an `auth` tRPC router to the Fastify backend that exchanges a server auth code for Google tokens and creates a session. Modifies the tRPC context to inject the user from a Bearer token. Updates the React Native frontend to use `@react-native-google-signin/google-signin` and Jotai for auth state.

**Tech Stack:** Fastify, tRPC, Drizzle ORM, PostgreSQL, `@react-native-google-signin/google-signin`, `google-auth-library`, Jotai.

**Spec:** docs/superpowers/specs/2026-08-30-google-auth-design.md

## Global Constraints

- `pnpm@11.10.0` — package manager, no changes
- `"type": "module"` — all new server packages must be ESM
- Use `dotenv` from catalog (`^17.4.2`) for env loading
- Tests must use `vitest` for the backend and `jest` for the frontend.

---

### Task 1: Database Schema Updates for Auth

**Files:**
- Modify: `apps/server/src/db/schema/users.ts`
- Create: `apps/server/src/db/schema/sessions.ts`
- Modify: `apps/server/src/db/schema/index.ts`

**Interfaces:**
- Produces: `sessions` table schema and updated `users` table schema.

- [ ] **Step 1: Write the failing schema compilation test**
Create `apps/server/test/auth-db.test.ts` that tries to import and use the new schema fields.
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**
Run: `pnpm -F server vitest run test/auth-db.test.ts`
Expected: FAIL due to missing fields and missing `sessions.js` module.

- [ ] **Step 3: Implement the schema changes**
Modify `apps/server/src/db/schema/users.ts`:
```typescript
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	avatarUrl: text("avatar_url"),
	googleId: varchar("google_id", { length: 255 }).unique(),
	googleRefreshToken: text("google_refresh_token"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
```

Create `apps/server/src/db/schema/sessions.ts`:
```typescript
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const sessions = pgTable("sessions", {
	id: varchar("id", { length: 255 }).primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});
```

Modify `apps/server/src/db/schema/index.ts` to export `sessions`.

- [ ] **Step 4: Run test to verify it passes**
Run: `pnpm -F server vitest run test/auth-db.test.ts`
Expected: PASS

- [ ] **Step 5: Generate and apply migrations**
Run: `pnpm -F server db:generate`
Run: `pnpm -F server db:migrate`

- [ ] **Step 6: Commit**
```bash
git add apps/server/src/db/schema apps/server/test apps/server/drizzle
git commit -m "feat(db): add sessions table and google auth fields to users"
```

---

### Task 2: Backend Auth Service and tRPC Router

**Files:**
- Modify: `apps/server/package.json`
- Create: `apps/server/src/services/auth.service.ts`
- Create: `apps/server/src/routers/auth.ts`
- Modify: `apps/server/src/routers/index.ts`
- Modify: `apps/server/src/context.ts`

**Interfaces:**
- Consumes: `users`, `sessions` schemas from Task 1.
- Produces: `loginWithGoogle` tRPC mutation. Protected procedure logic in `context.ts`.

- [ ] **Step 1: Install google-auth-library**
Run: `pnpm -F server add google-auth-library`

- [ ] **Step 2: Write auth service and tRPC context**
Create `apps/server/src/services/auth.service.ts`:
```typescript
import { OAuth2Client } from "google-auth-library";
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const client = new OAuth2Client(
	process.env.GOOGLE_SERVER_CLIENT_ID,
	process.env.GOOGLE_CLIENT_SECRET,
	"postmessage"
);

export async function authenticateWithGoogle(code: string) {
	const { tokens } = await client.getToken(code);
	const ticket = await client.verifyIdToken({
		idToken: tokens.id_token!,
		audience: process.env.GOOGLE_SERVER_CLIENT_ID,
	});
	const payload = ticket.getPayload()!;
	
	if (!payload.email?.endsWith("@ucsal.edu.br")) {
		throw new Error("UNAUTHORIZED_DOMAIN");
	}
	
	let user = await db.query.users.findFirst({ where: eq(users.googleId, payload.sub) });
	
	if (!user) {
		const [newUser] = await db.insert(users).values({
			name: payload.name!,
			email: payload.email,
			avatarUrl: payload.picture,
			googleId: payload.sub,
			googleRefreshToken: tokens.refresh_token,
		}).returning();
		user = newUser;
	} else if (tokens.refresh_token) {
		await db.update(users).set({ googleRefreshToken: tokens.refresh_token }).where(eq(users.id, user.id));
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
	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		with: { user: true } // Note: requires relation definition in schema, or manual join
	});
	if (!session || session.expiresAt < new Date()) return null;
	return session.user;
}
```
*Note: Since Drizzle `with: { user: true }` requires relations, if relations are not set up, write a manual join query in `validateSession`.*

- [ ] **Step 3: Update `context.ts` to read Bearer token**
Modify `apps/server/src/context.ts`:
```typescript
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { validateSession } from "./services/auth.service.js";

export async function createContext({ req, res }: CreateFastifyContextOptions) {
	const authHeader = req.headers.authorization;
	let user = null;
	
	if (authHeader && authHeader.startsWith("Bearer ")) {
		const sessionId = authHeader.split(" ")[1];
		user = await validateSession(sessionId);
	}
	
	return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 4: Create `auth.ts` router and add to `index.ts`**
Create `apps/server/src/routers/auth.ts`:
```typescript
import { z } from "zod";
import { publicProcedure, router } from "../trpc.js";
import { authenticateWithGoogle } from "../services/auth.service.js";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
	loginWithGoogle: publicProcedure
		.input(z.object({ serverAuthCode: z.string() }))
		.mutation(async ({ input }) => {
			try {
				return await authenticateWithGoogle(input.serverAuthCode);
			} catch (err: any) {
				if (err.message === "UNAUTHORIZED_DOMAIN") {
					throw new TRPCError({ code: "FORBIDDEN", message: "Use seu e-mail @ucsal.edu.br" });
				}
				throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha na autenticação" });
			}
		}),
});
```
Add it to `apps/server/src/routers/index.ts` as `auth: authRouter`.

- [ ] **Step 5: Run tests**
Run `pnpm -F server vitest run` to ensure server still builds and boots.

- [ ] **Step 6: Commit**
```bash
git add apps/server
git commit -m "feat(server): add google auth service, tRPC router, and session context"
```

---

### Task 3: React Native Google Sign-In Integration

**Files:**
- Modify: `apps/native/package.json`
- Modify: `apps/native/features/login/login.viewmodel.ts`
- Modify: `apps/native/app.json`

**Interfaces:**
- Consumes: The `loginWithGoogle` mutation from the server API.

- [ ] **Step 1: Install `@react-native-google-signin/google-signin`**
Run: `pnpm -F native add @react-native-google-signin/google-signin`

- [ ] **Step 2: Configure `app.json`**
Add the plugin to `apps/native/app.json` inside the `"plugins"` array:
```json
"@react-native-google-signin/google-signin"
```

- [ ] **Step 3: Update `login.viewmodel.ts`**
Update `apps/native/features/login/login.viewmodel.ts` to actually call Google Sign-In and tRPC.
```typescript
import { useCallback, useState } from "react";
import { GoogleSignin, statusCodes, isErrorWithCode } from "@react-native-google-signin/google-signin";
import type { AuthStatus } from "@/features/login/login.model";
import { trpc } from "@/utils/trpc";
import * as SecureStore from "expo-secure-store";

GoogleSignin.configure({
	webClientId: process.env.EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID,
	offlineAccess: true,
	forceCodeForRefreshToken: true,
	scopes: ["https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/drive.readonly"]
});

export function useLoginViewModel() {
	const [status, setStatus] = useState<AuthStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const loginMutation = trpc.auth.loginWithGoogle.useMutation();

	const signInWithGoogle = useCallback(async () => {
		setStatus("authenticating");
		setError(null);
		try {
			await GoogleSignin.hasPlayServices();
			const response = await GoogleSignin.signIn();
			
			if (!response.data?.serverAuthCode) {
				throw new Error("No server auth code returned");
			}
			
			const result = await loginMutation.mutateAsync({ 
				serverAuthCode: response.data.serverAuthCode 
			});
			
			await SecureStore.setItemAsync("session_id", result.sessionId);
			setStatus("idle");
			// Optional: Trigger global auth state update here
			
		} catch (err: any) {
			setStatus("error");
			if (isErrorWithCode(err)) {
				if (err.code === statusCodes.SIGN_IN_CANCELLED) {
					setError("Login cancelado.");
				} else {
					setError("Erro no login do Google.");
				}
			} else {
				setError(err.message || "Não foi possível entrar. Tente novamente.");
			}
		}
	}, [loginMutation]);

	return { status, error, signInWithGoogle } as const;
}
```

- [ ] **Step 4: Fix any tests**
Run: `pnpm -F native test`
Since we're importing `react-native-google-signin`, we might need to mock it in Jest. If tests fail on import, add to `apps/native/jest.setup.ts`:
```typescript
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
  isErrorWithCode: jest.fn(),
}));
```

- [ ] **Step 5: Commit**
```bash
git add apps/native
git commit -m "feat(native): integrate native google sign in and call trpc auth router"
```
