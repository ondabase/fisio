CREATE TYPE "public"."assessment_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."assessment_outcome" AS ENUM('eligible', 'refer', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('active', 'paused', 'completed', 'stopped_referred');--> statement-breakpoint
CREATE TYPE "public"."safety_severity" AS ENUM('urgent', 'refer');--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"assessment_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"value" jsonb NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_answers_assessment_id_question_id_pk" PRIMARY KEY("assessment_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"status" "assessment_status" DEFAULT 'in_progress' NOT NULL,
	"outcome" "assessment_outcome",
	"body_regions" text[],
	"track_id" text,
	"start_phase" text,
	"engine_trace" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"content_version_id" uuid NOT NULL,
	"track_id" text NOT NULL,
	"current_phase" text NOT NULL,
	"status" "program_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safety_aggregates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_version_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"outcome" "assessment_outcome" NOT NULL,
	"period" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "safety_aggregates_key" UNIQUE("content_version_id","rule_id","outcome","period")
);
--> statement-breakpoint
CREATE TABLE "safety_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"severity" "safety_severity" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_aggregates" ADD CONSTRAINT "safety_aggregates_content_version_id_content_versions_id_fk" FOREIGN KEY ("content_version_id") REFERENCES "public"."content_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_flags" ADD CONSTRAINT "safety_flags_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_one_in_progress_per_user" ON "assessments" USING btree ("user_id") WHERE "assessments"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "programs_one_active_per_user" ON "programs" USING btree ("user_id") WHERE "programs"."status" = 'active';