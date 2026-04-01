CREATE TYPE "public"."credit_status" AS ENUM('dispersed');--> statement-breakpoint
CREATE TABLE "credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"status" "credit_status" NOT NULL,
	"disbursement_date" timestamp with time zone NOT NULL,
	"transfer_amount" numeric(12, 2) NOT NULL,
	"disbursed_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credits_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_disbursed_by_user_id_users_id_fk" FOREIGN KEY ("disbursed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;