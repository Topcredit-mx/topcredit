CREATE TYPE "public"."application_status" AS ENUM('new', 'pending', 'invalid-documentation', 'pre-authorized', 'authorized', 'denied');--> statement-breakpoint
CREATE TYPE "public"."duration_type" AS ENUM('bi-monthly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."employee_salary_frequency" AS ENUM('bi-monthly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."roles" AS ENUM('applicant', 'agent', 'requests', 'admin');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"applicant_id" integer NOT NULL,
	"term_offering_id" integer NOT NULL,
	"credit_amount" numeric(12, 2) NOT NULL,
	"salary_at_application" numeric(12, 2) NOT NULL,
	"status" "application_status" NOT NULL,
	"denial_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"rate" numeric(5, 4) NOT NULL,
	"borrowing_capacity_rate" numeric(3, 2),
	"employee_salary_frequency" "employee_salary_frequency" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "email_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"ip_address" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_otps_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"expires" timestamp NOT NULL
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
CREATE TABLE "user_companies" (
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_companies_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer NOT NULL,
	"role" "roles" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"image" text,
	"email_verified" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"first_login" boolean DEFAULT true,
	"mfa_method" text DEFAULT 'email' NOT NULL,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"totp_backup_codes" text,
	"login_failed_attempts" integer DEFAULT 0 NOT NULL,
	"last_otp_sent_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_term_offering_id_term_offerings_id_fk" FOREIGN KEY ("term_offering_id") REFERENCES "public"."term_offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_offerings" ADD CONSTRAINT "term_offerings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_offerings" ADD CONSTRAINT "term_offerings_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;