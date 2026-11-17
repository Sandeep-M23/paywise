CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"job_title" text NOT NULL,
	"department" text NOT NULL,
	"country_code" char(2) NOT NULL,
	"salary_amount" bigint NOT NULL,
	"salary_currency" char(3) NOT NULL,
	"gender" text DEFAULT 'undisclosed' NOT NULL,
	"employment_type" text NOT NULL,
	"hire_date" date NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"deactivated_at" timestamp with time zone,
	"deactivation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_salary_positive" CHECK ("employees"."salary_amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"row_count" integer NOT NULL,
	"created_count" integer NOT NULL,
	"updated_count" integer NOT NULL,
	"skipped_count" integer NOT NULL,
	"status" text DEFAULT 'committed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salary_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"previous_amount" bigint,
	"currency" char(3) NOT NULL,
	"effective_on" date NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"import_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salary_revisions_amount_positive" CHECK ("salary_revisions"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_revisions" ADD CONSTRAINT "salary_revisions_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "employees_code_unique" ON "employees" USING btree ("employee_code");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_email_unique" ON "employees" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "employees_country_title_idx" ON "employees" USING btree ("country_code","job_title");--> statement-breakpoint
CREATE INDEX "employees_country_department_idx" ON "employees" USING btree ("country_code","department");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employees_name_trgm_idx" ON "employees" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "salary_revisions_employee_effective_idx" ON "salary_revisions" USING btree ("employee_id","effective_on");--> statement-breakpoint
CREATE INDEX "salary_revisions_import_idx" ON "salary_revisions" USING btree ("import_id");