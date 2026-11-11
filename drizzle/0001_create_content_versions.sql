CREATE TYPE "public"."content_status" AS ENUM('draft', 'approved', 'retired');--> statement-breakpoint
CREATE TABLE "content_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" text NOT NULL,
	"version" text NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"bundle" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	CONSTRAINT "content_versions_content_id_version_unique" UNIQUE("content_id","version")
);
