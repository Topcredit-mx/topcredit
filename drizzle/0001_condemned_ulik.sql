ALTER TYPE "public"."roles" ADD VALUE 'hr' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."roles" ADD VALUE 'dispersions' BEFORE 'admin';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "first_discount_date" timestamp;