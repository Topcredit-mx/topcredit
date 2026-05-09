CREATE TYPE "public"."liquidation_request_status" AS ENUM('pending', 'accepted', 'denied');--> statement-breakpoint
ALTER TYPE "public"."roles" ADD VALUE 'liquidations' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "credit_liquidation_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"credit_id" integer NOT NULL,
	"applicant_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"status" "liquidation_request_status" NOT NULL,
	"denial_reason" text,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" integer,
	"liquidated_principal" numeric(12, 2),
	"liquidated_financing" numeric(12, 2),
	"liquidated_scheduled_total" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_payments" ADD COLUMN "principal_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_payments" ADD COLUMN "financing_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_payments" ADD COLUMN "closed_by_liquidation_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credit_liquidation_requests" ADD CONSTRAINT "credit_liquidation_requests_credit_id_credits_id_fk" FOREIGN KEY ("credit_id") REFERENCES "public"."credits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_liquidation_requests" ADD CONSTRAINT "credit_liquidation_requests_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_liquidation_requests" ADD CONSTRAINT "credit_liquidation_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_liquidation_requests" ADD CONSTRAINT "credit_liquidation_requests_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;