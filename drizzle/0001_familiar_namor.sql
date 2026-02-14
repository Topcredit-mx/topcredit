ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
UPDATE "user_roles" SET "role" = 'applicant' WHERE "role" = 'customer';--> statement-breakpoint
UPDATE "user_roles" SET "role" = 'agent' WHERE "role" = 'employee';--> statement-breakpoint
DROP TYPE "public"."roles";--> statement-breakpoint
CREATE TYPE "public"."roles" AS ENUM('applicant', 'agent', 'requests', 'admin');--> statement-breakpoint
ALTER TABLE "user_roles" ALTER COLUMN "role" SET DATA TYPE "public"."roles" USING "role"::"public"."roles";