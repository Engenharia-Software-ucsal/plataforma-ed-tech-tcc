import { authRouter } from "../routers/auth.js";
import { classRouter } from "../routers/class.js";
import { foldersRouter } from "../routers/folders.js";
import { healthRouter } from "../routers/health.js";
import { materialsRouter } from "../routers/materials.js";
import { notesRouter } from "../routers/notes.js";
import { quizRouter } from "../routers/quiz.js";
import { trashRouter } from "../routers/trash.js";
import { router } from "./index.js";

export const appRouter = router({
	health: healthRouter,
	class: classRouter,
	auth: authRouter,
	notes: notesRouter,
	folders: foldersRouter,
	trash: trashRouter,
	materials: materialsRouter,
	quiz: quizRouter,
});

export type AppRouter = typeof appRouter;
