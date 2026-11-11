CREATE TYPE "public"."ingestion_status" AS ENUM('pending', 'processing', 'ready', 'failed', 'unsupported');--> statement-breakpoint
CREATE TABLE "material_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_material_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" real[] NOT NULL,
	"embedding_model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "ingestion_status" "ingestion_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "ingestion_error" text;--> statement-breakpoint
ALTER TABLE "course_materials" ADD COLUMN "ingested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "material_chunks" ADD CONSTRAINT "material_chunks_course_material_id_course_materials_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "material_chunks_course_material_id_idx" ON "material_chunks" USING btree ("course_material_id");