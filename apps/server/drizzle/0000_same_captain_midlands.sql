CREATE TYPE "public"."bus_stop" AS ENUM('UCSAL', 'PITUACU');--> statement-breakpoint
CREATE TYPE "public"."difficulty_level" AS ENUM('facil', 'medio', 'dificil');--> statement-breakpoint
CREATE TYPE "public"."occupancy_level" AS ENUM('vazio', 'moderado', 'cheio');--> statement-breakpoint
CREATE TABLE "bus_departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time" text NOT NULL,
	"stop" "bus_stop" NOT NULL,
	"route" text NOT NULL,
	"status" text NOT NULL,
	"occupancy" "occupancy_level" DEFAULT 'vazio' NOT NULL,
	"delay_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"subject" text NOT NULL,
	"professor" text NOT NULL,
	"room" text NOT NULL,
	"difficulty_level" "difficulty_level" DEFAULT 'medio' NOT NULL,
	"difficulty_score" numeric(3, 1) DEFAULT '0.0' NOT NULL,
	"difficulty_review_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
