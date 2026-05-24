CREATE TYPE "public"."queue_bulk_confirm_job_kind" AS ENUM('hr_deductions', 'installments');--> statement-breakpoint
CREATE TYPE "public"."queue_bulk_confirm_job_status" AS ENUM('pending', 'running', 'completed', 'partial', 'failed');--> statement-breakpoint
CREATE TABLE "queue_bulk_confirm_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "queue_bulk_confirm_job_kind" NOT NULL,
	"status" "queue_bulk_confirm_job_status" DEFAULT 'pending' NOT NULL,
	"created_by_user_id" integer NOT NULL,
	"payment_ids" jsonb NOT NULL,
	"total_count" integer NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"succeeded_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"failures" jsonb NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "queue_bulk_confirm_jobs" ADD CONSTRAINT "queue_bulk_confirm_jobs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;