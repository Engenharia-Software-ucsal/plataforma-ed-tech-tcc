ALTER TABLE "class_sessions" ADD COLUMN "google_course_id" varchar(255);--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN "semester" varchar(16) DEFAULT '2026.2' NOT NULL;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN "topics" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "google_material_id" varchar(255);--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_google_course_id_unique" UNIQUE("google_course_id");--> statement-breakpoint
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_google_material_id_unique" UNIQUE("google_material_id");