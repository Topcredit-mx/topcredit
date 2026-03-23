ALTER TYPE "public"."application_status" ADD VALUE 'awaiting-authorization' BEFORE 'authorized';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'official-id' BEFORE 'authorization';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'proof-of-address' BEFORE 'authorization';--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE 'bank-statement' BEFORE 'authorization';--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_financial_terms_required_for_late_statuses_check";--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_financial_terms_required_for_late_statuses_check" CHECK (("applications"."status" NOT IN ('pre-authorized', 'awaiting-authorization', 'authorized') OR ("applications"."term_offering_id" IS NOT NULL AND "applications"."credit_amount" IS NOT NULL)));