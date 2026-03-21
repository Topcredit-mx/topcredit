ALTER TABLE "applications" ADD COLUMN "salary_frequency" "employee_salary_frequency" DEFAULT 'monthly'::"employee_salary_frequency" NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "salary_frequency" DROP DEFAULT;
