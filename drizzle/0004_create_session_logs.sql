CREATE TABLE "exercise_logs" (
	"session_log_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"completed" boolean NOT NULL,
	"sets_done" integer NOT NULL,
	CONSTRAINT "exercise_logs_session_log_id_position_pk" PRIMARY KEY("session_log_id","position")
);
--> statement-breakpoint
CREATE TABLE "session_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"phase_id" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"pain_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exercise_logs" ADD CONSTRAINT "exercise_logs_session_log_id_session_logs_id_fk" FOREIGN KEY ("session_log_id") REFERENCES "public"."session_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_logs_program_idx" ON "session_logs" USING btree ("program_id");