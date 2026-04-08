ALTER TABLE "credit_payments" ADD COLUMN "payments_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "credit_payments" ADD COLUMN "payments_confirmed_by_user_id" integer;--> statement-breakpoint
ALTER TYPE "public"."roles" ADD VALUE 'payments' BEFORE 'admin';--> statement-breakpoint
UPDATE "credit_payments" SET "payments_confirmed_at" = "hr_confirmed_at", "payments_confirmed_by_user_id" = "confirmed_by_user_id" WHERE "hr_confirmed_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_payments" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_payments_confirmed_by_user_id_users_id_fk" FOREIGN KEY ("payments_confirmed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."credit_payment_status";
