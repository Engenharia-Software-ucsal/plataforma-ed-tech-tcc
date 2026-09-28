# Backend Initial Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `apps/server` backend application using Fastify + tRPC + Drizzle ORM + Zod, following the Better-T-Stack conventions, and wire it into the existing Turborepo monorepo so `pnpm dev` starts both frontend and backend.

**Architecture:** The server lives in `apps/server/` as a Fastify HTTP server exposing a tRPC router at `/trpc`. Database access is via Drizzle ORM connected to PostgreSQL. Environment validation is centralized in the existing `packages/env` package with a new `./server` export. A shared `packages/api` package re-exports the `AppRouter` type so the React Native app can create a type-safe tRPC client without importing server code.

**Tech Stack:** Fastify 5, @trpc/server (v11 Fastify adapter), Drizzle ORM (node-postgres driver), drizzle-kit, Zod 4, tsx (dev runner), TypeScript 6, Vitest

**Spec:** Architecture vision from [2026-08-15-design-system-implementation.md](file:///home/daviribeiro/projects/personal/busuucsal-v3/docs/superpowers/plans/2026-08-15-design-system-implementation.md) and [2026-08-17-remaining-screens-implementation.md](file:///home/daviribeiro/projects/personal/busuucsal-v3/docs/superpowers/plans/2026-08-17-remaining-screens-implementation.md), Context7 docs for tRPC Fastify adapter, Drizzle ORM, and Better-T-Stack project structure.

## Global Constraints

- `pnpm@11.10.0` — package manager, no changes
- `typescript@^6.0.3` — match existing workspace version
- `zod@^4.4.3` — use catalog version from `pnpm-workspace.yaml`
- `"type": "module"` — all new packages must be ESM
- Base TSConfig extends `@busuucsal-v3/config/tsconfig.base.json` (target `ESNext`, `moduleResolution: "bundler"`, `strict: true`, `verbatimModuleSyntax: true`)
- Biome formatter/linter already configured at root — no ESLint/Prettier needed
- Server port: `3000` (matches existing `EXPO_PUBLIC_SERVER_URL=http://localhost:3000` in native `.env`)
- Use `dotenv` from catalog (`^17.4.2`) for env loading
- Database: PostgreSQL (local Docker for dev, connection string via `DATABASE_URL`)

---

## File Structure

```
apps/server/
├── package.json
├── tsconfig.json
├── drizzle.config.ts
├── .env.example
├── src/
│   ├── index.ts                 # Fastify entry point, registers tRPC plugin
│   ├── db/
│   │   ├── index.ts             # Drizzle client (drizzle/node-postgres)
│   │   └── schema/
│   │       ├── index.ts         # Re-exports all tables
│   │       ├── users.ts         # Users table
│   │       ├── bus-departures.ts # Bus departures table
│   │       └── class-sessions.ts # Class sessions table
│   ├── trpc/
│   │   ├── index.ts             # initTRPC, exports t, router, publicProcedure
│   │   ├── context.ts           # Fastify context creator (req, res, db)
│   │   └── router.ts            # Root appRouter merging sub-routers
│   └── routers/
│       ├── health.ts            # Health check router
│       ├── bus.ts               # Bus departures CRUD
│       └── class.ts             # Class sessions CRUD
├── drizzle/                     # Auto-generated migrations (drizzle-kit output)
└── test/
    └── health.test.ts           # Smoke test for health endpoint

packages/env/
└── src/
    └── server.ts                # NEW: Server env validation (DATABASE_URL, PORT, etc.)

packages/api/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts                 # Re-exports AppRouter type for the native app

docker-compose.yml               # Local PostgreSQL for dev
```

---

### Task 1: Scaffold `apps/server` Package and Wire into Monorepo

**Files:**
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts` (minimal "hello world" Fastify server)
- Modify: `package.json` (root) — add `dev:server` script

**Interfaces:**
- Consumes: `@busuucsal-v3/config/tsconfig.base.json` (base TSConfig)
- Produces: Working Fastify server that starts on port 3000 and responds to `GET /` with `{ status: "ok" }`

- [ ] **Step 1: Create `apps/server/package.json`**

```json
{
  "name": "server",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@busuucsal-v3/config": "workspace:*",
    "@busuucsal-v3/env": "workspace:*",
    "dotenv": "catalog:",
    "fastify": "^5.3.3",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@types/node": "^22.20.1",
    "tsx": "^4.19.4",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `apps/server/tsconfig.json`**

```json
{
  "extends": "@busuucsal-v3/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `apps/server/src/index.ts` (minimal Fastify server)**

```typescript
import Fastify from "fastify";

const server = Fastify({ logger: true });

server.get("/", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

- [ ] **Step 4: Add `dev:server` script to root `package.json`**

Add to the root `package.json` scripts:

```json
"dev:server": "turbo run dev -F server --"
```

- [ ] **Step 5: Install dependencies and verify server starts**

```bash
cd /home/daviribeiro/projects/personal/busuucsal-v3
pnpm install
pnpm dev:server
```

Expected: Server starts on port 3000, `curl http://localhost:3000/` returns `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
git add apps/server/ package.json pnpm-lock.yaml
git commit -m "feat(server): scaffold fastify server in apps/server"
```

---

### Task 2: Environment Validation for Server

**Files:**
- Create: `packages/env/src/server.ts`
- Modify: `packages/env/package.json` — add `./server` export
- Create: `apps/server/.env` (local dev defaults)
- Create: `apps/server/.env.example`
- Modify: `apps/server/src/index.ts` — use validated env

**Interfaces:**
- Consumes: `@t3-oss/env-core`, `zod` (catalog)
- Produces: `env` object exported from `@busuucsal-v3/env/server` with validated `DATABASE_URL: string`, `PORT: number`, `NODE_ENV: string`

- [ ] **Step 1: Create `packages/env/src/server.ts`**

```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    PORT: z
      .string()
      .default("3000")
      .transform((v) => Number.parseInt(v, 10)),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 2: Add `./server` export to `packages/env/package.json`**

Change the `exports` field from:

```json
"exports": {
  "./native": "./src/native.ts"
}
```

To:

```json
"exports": {
  "./native": "./src/native.ts",
  "./server": "./src/server.ts"
}
```

- [ ] **Step 3: Create `apps/server/.env` and `apps/server/.env.example`**

Both files with the same content:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/busuucsal
PORT=3000
NODE_ENV=development
```

- [ ] **Step 4: Update `apps/server/src/index.ts` to use validated env**

```typescript
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
```

- [ ] **Step 5: Ensure `apps/server/.env` is gitignored**

Check root `.gitignore` already covers `.env`. If not, add:

```
apps/server/.env
```

- [ ] **Step 6: Run and verify**

```bash
pnpm install
pnpm dev:server
# In another terminal:
curl http://localhost:3000/
```

Expected: `{"status":"ok","environment":"development"}`

- [ ] **Step 7: Commit**

```bash
git add packages/env/src/server.ts packages/env/package.json apps/server/.env.example apps/server/src/index.ts
git commit -m "feat(env): add server env validation with DATABASE_URL and PORT"
```

---

### Task 3: Drizzle ORM Setup with PostgreSQL Schema

**Files:**
- Create: `apps/server/drizzle.config.ts`
- Create: `apps/server/src/db/index.ts`
- Create: `apps/server/src/db/schema/index.ts`
- Create: `apps/server/src/db/schema/users.ts`
- Create: `apps/server/src/db/schema/bus-departures.ts`
- Create: `apps/server/src/db/schema/class-sessions.ts`
- Modify: `apps/server/package.json` — add drizzle dependencies + scripts

**Interfaces:**
- Consumes: `@busuucsal-v3/env/server` (for `DATABASE_URL`)
- Produces: `db` — Drizzle client instance; `users`, `busDepartures`, `classSessions` — Drizzle table schemas; `pnpm db:generate` and `pnpm db:migrate` scripts

- [ ] **Step 1: Add Drizzle dependencies to `apps/server/package.json`**

Add to `dependencies`:

```json
"drizzle-orm": "^0.44.2"
```

Add to `devDependencies`:

```json
"drizzle-kit": "^0.31.5"
```

Add to `scripts`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 2: Create `apps/server/drizzle.config.ts`**

```typescript
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: Create `apps/server/src/db/schema/users.ts`**

```typescript
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Create `apps/server/src/db/schema/bus-departures.ts`**

```typescript
import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const busStopEnum = pgEnum("bus_stop", ["UCSAL", "PITUACU"]);
export const occupancyEnum = pgEnum("occupancy_level", ["vazio", "moderado", "cheio"]);

export const busDepartures = pgTable("bus_departures", {
  id: uuid("id").primaryKey().defaultRandom(),
  time: text("time").notNull(),
  stop: busStopEnum("stop").notNull(),
  route: text("route").notNull(),
  status: text("status").notNull(),
  occupancy: occupancyEnum("occupancy").notNull().default("vazio"),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Create `apps/server/src/db/schema/class-sessions.ts`**

```typescript
import { integer, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const difficultyEnum = pgEnum("difficulty_level", ["facil", "medio", "dificil"]);

export const classSessions = pgTable("class_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  subject: text("subject").notNull(),
  professor: text("professor").notNull(),
  room: text("room").notNull(),
  difficultyLevel: difficultyEnum("difficulty_level").notNull().default("medio"),
  difficultyScore: numeric("difficulty_score", { precision: 3, scale: 1 }).notNull().default("0.0"),
  difficultyReviewCount: integer("difficulty_review_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 6: Create `apps/server/src/db/schema/index.ts`**

```typescript
export { users } from "./users.js";
export { busDepartures, busStopEnum, occupancyEnum } from "./bus-departures.js";
export { classSessions, difficultyEnum } from "./class-sessions.js";
```

- [ ] **Step 7: Create `apps/server/src/db/index.ts`**

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@busuucsal-v3/env/server";
import * as schema from "./schema/index.js";

export const db = drizzle(env.DATABASE_URL, { schema });
export type Database = typeof db;
```

- [ ] **Step 8: Run `pnpm install` and generate initial migration**

```bash
pnpm install
cd apps/server
pnpm db:generate
```

Expected: A migration SQL file appears in `apps/server/drizzle/`. Inspect it to verify `CREATE TABLE` statements for `users`, `bus_departures`, `class_sessions`, and the enums.

- [ ] **Step 9: Commit**

```bash
git add apps/server/drizzle.config.ts apps/server/src/db/ apps/server/drizzle/ apps/server/package.json pnpm-lock.yaml
git commit -m "feat(db): add drizzle schema for users, bus departures, class sessions"
```

---

### Task 4: tRPC Core Setup with Fastify Adapter

**Files:**
- Create: `apps/server/src/trpc/context.ts`
- Create: `apps/server/src/trpc/index.ts`
- Create: `apps/server/src/routers/health.ts`
- Create: `apps/server/src/trpc/router.ts`
- Modify: `apps/server/src/index.ts` — register tRPC plugin
- Modify: `apps/server/package.json` — add tRPC dependency

**Interfaces:**
- Consumes: `db` from `apps/server/src/db/index.ts`, `CreateFastifyContextOptions` from `@trpc/server/adapters/fastify`
- Produces: `appRouter` (root tRPC router), `AppRouter` (exported type), `createContext()` function, `publicProcedure` base procedure

- [ ] **Step 1: Add tRPC dependency to `apps/server/package.json`**

Add to `dependencies`:

```json
"@trpc/server": "^11.1.2"
```

- [ ] **Step 2: Create `apps/server/src/trpc/context.ts`**

```typescript
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db } from "../db/index.js";

export function createContext({ req, res }: CreateFastifyContextOptions) {
  return { req, res, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 3: Create `apps/server/src/trpc/index.ts`**

```typescript
import { initTRPC } from "@trpc/server";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
```

- [ ] **Step 4: Create `apps/server/src/routers/health.ts`**

```typescript
import { router, publicProcedure } from "../trpc/index.js";

export const healthRouter = router({
  check: publicProcedure.query(() => {
    return { status: "healthy", timestamp: new Date().toISOString() };
  }),
});
```

- [ ] **Step 5: Create `apps/server/src/trpc/router.ts`**

```typescript
import { router } from "./index.js";
import { healthRouter } from "../routers/health.js";

export const appRouter = router({
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 6: Update `apps/server/src/index.ts` to register tRPC plugin**

```typescript
import "dotenv/config";
import Fastify from "fastify";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { env } from "@busuucsal-v3/env/server";
import { createContext } from "./trpc/context.js";
import { appRouter, type AppRouter } from "./trpc/router.js";

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
```

- [ ] **Step 7: Run `pnpm install` and verify tRPC endpoint**

```bash
pnpm install
pnpm dev:server
# In another terminal:
curl "http://localhost:3000/trpc/health.check"
```

Expected: `{"result":{"data":{"status":"healthy","timestamp":"..."}}}`

- [ ] **Step 8: Commit**

```bash
git add apps/server/src/trpc/ apps/server/src/routers/health.ts apps/server/src/index.ts apps/server/package.json pnpm-lock.yaml
git commit -m "feat(trpc): wire tRPC fastify adapter with health check router"
```

---

### Task 5: Bus and Class Domain Routers with Zod Validation

**Files:**
- Create: `apps/server/src/routers/bus.ts`
- Create: `apps/server/src/routers/class.ts`
- Modify: `apps/server/src/trpc/router.ts` — add bus and class routers

**Interfaces:**
- Consumes: `publicProcedure`, `router` from `apps/server/src/trpc/index.ts`; `db` from context; `busDepartures`, `classSessions` from schema
- Produces: `busRouter` with `list`, `byId`, `create` procedures; `classRouter` with `list`, `byId`, `create` procedures

- [ ] **Step 1: Create `apps/server/src/routers/bus.ts`**

```typescript
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc/index.js";
import { busDepartures } from "../db/schema/index.js";

export const busRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(busDepartures).orderBy(busDepartures.time);
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [departure] = await ctx.db
        .select()
        .from(busDepartures)
        .where(eq(busDepartures.id, input.id));
      if (!departure) {
        throw new Error("Bus departure not found");
      }
      return departure;
    }),

  create: publicProcedure
    .input(
      z.object({
        time: z.string(),
        stop: z.enum(["UCSAL", "PITUACU"]),
        route: z.string(),
        status: z.string(),
        occupancy: z.enum(["vazio", "moderado", "cheio"]).default("vazio"),
        delayMinutes: z.number().int().nonnegative().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(busDepartures)
        .values(input)
        .returning();
      return created;
    }),
});
```

- [ ] **Step 2: Create `apps/server/src/routers/class.ts`**

```typescript
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, publicProcedure } from "../trpc/index.js";
import { classSessions } from "../db/schema/index.js";

export const classRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(classSessions).orderBy(classSessions.startTime);
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(classSessions)
        .where(eq(classSessions.id, input.id));
      if (!session) {
        throw new Error("Class session not found");
      }
      return session;
    }),

  create: publicProcedure
    .input(
      z.object({
        startTime: z.string(),
        endTime: z.string(),
        subject: z.string(),
        professor: z.string(),
        room: z.string(),
        difficultyLevel: z.enum(["facil", "medio", "dificil"]).default("medio"),
        difficultyScore: z.string().default("0.0"),
        difficultyReviewCount: z.number().int().nonnegative().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(classSessions)
        .values(input)
        .returning();
      return created;
    }),
});
```

- [ ] **Step 3: Update `apps/server/src/trpc/router.ts` to add domain routers**

```typescript
import { router } from "./index.js";
import { healthRouter } from "../routers/health.js";
import { busRouter } from "../routers/bus.js";
import { classRouter } from "../routers/class.js";

export const appRouter = router({
  health: healthRouter,
  bus: busRouter,
  class: classRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Verify endpoints work**

Ensure PostgreSQL is running:

```bash
docker run -d --name busuucsal-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=busuucsal -p 5432:5432 postgres:17-alpine
```

Push schema and start server:

```bash
cd apps/server
pnpm db:push
cd ../..
pnpm dev:server
```

Test bus list:

```bash
curl "http://localhost:3000/trpc/bus.list"
```

Expected: `{"result":{"data":[]}}` (empty array since no records yet)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routers/ apps/server/src/trpc/router.ts
git commit -m "feat(routers): add bus and class session CRUD routers with zod validation"
```

---

### Task 6: Shared API Package for Type-Safe Client

**Files:**
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/index.ts`

**Interfaces:**
- Consumes: `AppRouter` type from `apps/server/src/trpc/router.ts`
- Produces: Re-exported `AppRouter` type accessible via `import type { AppRouter } from "@busuucsal-v3/api"` in the native app

- [ ] **Step 1: Create `packages/api/package.json`**

```json
{
  "name": "@busuucsal-v3/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@trpc/server": "^11.1.2"
  },
  "devDependencies": {
    "@busuucsal-v3/config": "workspace:*",
    "@types/node": "^22.20.1",
    "typescript": "^6.0.3"
  }
}
```

- [ ] **Step 2: Create `packages/api/tsconfig.json`**

```json
{
  "extends": "@busuucsal-v3/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `packages/api/src/index.ts`**

```typescript
export type { AppRouter } from "../../../apps/server/src/trpc/router.js";
```

> [!NOTE]
> This uses a relative path to the server's router. The `type` keyword ensures no runtime code is imported — only types flow across the package boundary. In a production monorepo you could use TypeScript project references, but this approach works cleanly with pnpm workspaces.

- [ ] **Step 4: Run `pnpm install` and verify types resolve**

```bash
pnpm install
cd packages/api
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api/ pnpm-lock.yaml
git commit -m "feat(api): create shared api package re-exporting AppRouter type"
```

---

### Task 7: CORS, `buildServer()` Extraction, and Health Tests

**Files:**
- Create: `apps/server/test/health.test.ts`
- Modify: `apps/server/src/index.ts` — add CORS, extract `buildServer()`
- Modify: `apps/server/package.json` — add CORS dep, Vitest, test script

**Interfaces:**
- Consumes: `buildServer()` from `apps/server/src/index.ts`
- Produces: Passing Vitest health check tests; CORS-enabled server

- [ ] **Step 1: Add CORS and Vitest dependencies to `apps/server/package.json`**

Add to `dependencies`:

```json
"@fastify/cors": "^11.0.1"
```

Add to `devDependencies`:

```json
"vitest": "^3.2.4"
```

Add to `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Refactor `apps/server/src/index.ts` — add CORS, extract `buildServer()`**

```typescript
import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify";
import { env } from "@busuucsal-v3/env/server";
import { createContext } from "./trpc/context.js";
import { appRouter, type AppRouter } from "./trpc/router.js";

export async function buildServer() {
  const server = Fastify({
    logger: true,
    routerOptions: {
      maxParamLength: 5000,
    },
  });

  await server.register(cors, { origin: true });

  await server.register(fastifyTRPCPlugin, {
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

  return server;
}

const start = async () => {
  const server = await buildServer();
  try {
    await server.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
```

- [ ] **Step 3: Create `apps/server/test/health.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { buildServer } from "../src/index.js";

describe("Health check", () => {
  it("GET / returns status ok", async () => {
    const server = await buildServer();

    const response = await server.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(
      expect.objectContaining({ status: "ok" }),
    );

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
```

- [ ] **Step 4: Run tests**

```bash
cd apps/server
pnpm test
```

Expected: 2 tests pass (GET `/` and GET `/trpc/health.check`)

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/index.ts apps/server/test/ apps/server/package.json pnpm-lock.yaml
git commit -m "feat(server): add CORS, extract buildServer(), add health smoke tests"
```

---

### Task 8: Docker Compose for Local Dev PostgreSQL

**Files:**
- Create: `docker-compose.yml` (project root)
- Modify: `package.json` (root) — add `db:up`, `db:down`, `db:migrate` scripts

**Interfaces:**
- Consumes: Nothing
- Produces: `docker compose up -d` starts a PostgreSQL 17 container on port 5432 with database `busuucsal`, user `postgres`, password `postgres`

- [ ] **Step 1: Create `docker-compose.yml` at project root**

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: busuucsal-pg
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: busuucsal
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Add convenience scripts to root `package.json`**

Add to `scripts`:

```json
"db:up": "docker compose up -d",
"db:down": "docker compose down",
"db:migrate": "turbo run db:migrate -F server"
```

- [ ] **Step 3: Verify full dev stack starts**

```bash
pnpm db:up
pnpm db:migrate
pnpm dev
```

Expected: PostgreSQL container running, migrations applied, both native and server dev processes start via Turbo.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml package.json
git commit -m "chore: add docker-compose for local postgres dev environment"
```
