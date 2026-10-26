import { authRouter } from "../routers/auth.js";
import { classRouter } from "../routers/class.js";
import { healthRouter } from "../routers/health.js";
import { materialsRouter } from "../routers/materials.js";
import { notesRouter } from "../routers/notes.js";
import { quizRouter } from "../routers/quiz.js";
import { router } from "./index.js";

export const appRouter = router({
	health: healthRouter,
	class: classRouter,
	auth: authRouter,
	notes: notesRouter,
	materials: materialsRouter,
	quiz: quizRouter,
});

export type AppRouter = typeof appRouter;
