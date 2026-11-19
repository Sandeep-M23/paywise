-- Applied by `npm run db:sync` after sequelize.sync() creates the tables from the
-- models. It holds what sync() can't express: CHECK constraints, foreign keys
-- with explicit actions, functional and trigram indexes. Idempotent: every
-- statement can run again on a database that already has it. Names match the
-- original migrations, so an existing database isn't given duplicates.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_salary_positive') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_salary_positive CHECK (salary_amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_amount_positive') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_amount_positive CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_employee_id_employees_id_fk') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_employee_id_employees_id_fk
      FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_import_id_imports_id_fk') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_import_id_imports_id_fk
      FOREIGN KEY (import_id) REFERENCES imports (id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS employees_code_unique ON employees (employee_code);
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique ON employees (lower(email));
CREATE INDEX IF NOT EXISTS employees_country_title_idx ON employees (country_code, job_title);
CREATE INDEX IF NOT EXISTS employees_country_department_idx ON employees (country_code, department);
CREATE INDEX IF NOT EXISTS employees_status_idx ON employees (status);
CREATE INDEX IF NOT EXISTS employees_name_trgm_idx ON employees USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS salary_revisions_employee_effective_idx ON salary_revisions (employee_id, effective_on);
CREATE INDEX IF NOT EXISTS salary_revisions_import_idx ON salary_revisions (import_id);
