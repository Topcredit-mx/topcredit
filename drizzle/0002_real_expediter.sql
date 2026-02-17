CREATE TYPE "public"."credit_status" AS ENUM('new', 'pending', 'invalid-documentation', 'authorized', 'denied', 'dispersed', 'settled', 'defaulted');--> statement-breakpoint
CREATE TYPE "public"."duration_type" AS ENUM('bi-monthly', 'monthly');--> statement-breakpoint
CREATE TABLE "credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"borrower_id" integer NOT NULL,
	"term_offering_id" integer NOT NULL,
	"credit_amount" numeric(12, 2) NOT NULL,
	"salary_at_application" numeric(12, 2) NOT NULL,
	"status" "credit_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "term_offerings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"term_id" integer NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "term_offerings_company_id_term_id_unique" UNIQUE("company_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"duration_type" "duration_type" NOT NULL,
	"duration" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_borrower_id_users_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_term_offering_id_term_offerings_id_fk" FOREIGN KEY ("term_offering_id") REFERENCES "public"."term_offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_offerings" ADD CONSTRAINT "term_offerings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_offerings" ADD CONSTRAINT "term_offerings_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;