CREATE TYPE "public"."credit_payment_status" AS ENUM('pending', 'confirmed');--> statement-breakpoint
CREATE TABLE "credit_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_id" integer NOT NULL,
	"due_date" timestamp NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "credit_payment_status" DEFAULT 'pending' NOT NULL,
	"hr_confirmed_at" timestamp with time zone,
	"confirmed_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_credit_id_credits_id_fk" FOREIGN KEY ("credit_id") REFERENCES "public"."credits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;