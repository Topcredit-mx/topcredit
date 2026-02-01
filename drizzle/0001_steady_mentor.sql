CREATE TABLE "user_companies" (
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_companies_user_id_company_id_pk" PRIMARY KEY("user_id","company_id")
);
--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;