CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"delete_batch" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "note_links" ALTER COLUMN "reason" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "auto_tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "delete_batch" uuid;--> statement-breakpoint
-- Dados (escrito à mão): prepara as notas existentes para os índices únicos abaixo.
-- 1. Títulos sem espaços nas pontas, como o app passa a gravar.
UPDATE "notes" SET "title" = btrim("title") WHERE "title" <> btrim("title");--> statement-breakpoint
-- 2. Títulos repetidos do mesmo aluno: a mais antiga fica com o nome; as outras ganham " (2)", " (3)"...
UPDATE "notes" AS n SET "title" = n."title" || ' (' || d.rn || ')'
FROM (
	SELECT "id", row_number() OVER (PARTITION BY "user_id", lower("title") ORDER BY "created_at", "id") AS rn
	FROM "notes"
) AS d
WHERE n."id" = d."id" AND d.rn > 1;--> statement-breakpoint
-- 3. Vínculos repetidos (mesmo par e tipo), se existirem.
DELETE FROM "note_links" AS a USING "note_links" AS b
WHERE a."source_note_id" = b."source_note_id"
	AND a."target_note_id" = b."target_note_id"
	AND a."link_type" = b."link_type"
	AND a."id" > b."id";--> statement-breakpoint
-- 4. Hashtag da matéria nas notas já vinculadas a uma aula. Mesma regra de slugifySubject (packages/notes/src/slug.ts).
UPDATE "notes" AS n SET "auto_tags" = ARRAY[s.slug]
FROM (
	SELECT "id", btrim(regexp_replace(lower(translate("subject",
		'áàâãäåéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
		'aaaaaaeeeeiiiiooooouuuucnAAAAAAEEEEIIIIOOOOOUUUUCN')), '[^a-z0-9]+', '-', 'g'), '-') AS slug
	FROM "class_sessions"
) AS s
WHERE n."class_session_id" = s."id" AND s.slug <> '';--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folders_user_id_idx" ON "folders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "folders_parent_id_idx" ON "folders" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "folders_user_parent_name_active_idx" ON "folders" USING btree ("user_id",coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid),lower("name")) WHERE "folders"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "note_links_source_target_type_idx" ON "note_links" USING btree ("source_note_id","target_note_id","link_type");--> statement-breakpoint
CREATE INDEX "note_links_target_note_id_idx" ON "note_links" USING btree ("target_note_id");--> statement-breakpoint
CREATE INDEX "notes_user_id_idx" ON "notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notes_folder_id_idx" ON "notes" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notes_user_title_active_idx" ON "notes" USING btree ("user_id",lower("title")) WHERE "notes"."deleted_at" is null;