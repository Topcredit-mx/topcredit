CREATE TYPE "public"."document_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('authorization', 'contract', 'payroll-receipt');--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"document_type" "document_type" NOT NULL,
	"status" "document_status" NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" text NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_rejection_reason_check" CHECK ((("application_documents"."status" = 'rejected' AND "application_documents"."rejection_reason" IS NOT NULL) OR ("application_documents"."status" <> 'rejected' AND "application_documents"."rejection_reason" IS NULL)))
);
--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "application_documents_application_id_document_type_idx" ON "application_documents" USING btree ("application_id","document_type");