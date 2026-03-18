ALTER TABLE "applications" ADD COLUMN "company_id" integer;--> statement-breakpoint
UPDATE "applications"
SET "company_id" = "term_offerings"."company_id"
FROM "term_offerings"
WHERE "applications"."term_offering_id" = "term_offerings"."id";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "term_offering_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "credit_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "payroll_number" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "rfc" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "clabe" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "street_and_number" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "interior_number" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;