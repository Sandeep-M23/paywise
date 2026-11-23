-- Applied by `npm run db:sync` after sequelize.sync() creates the tables from the
-- models. It holds what sync() can't express: CHECK constraints, foreign keys
-- (including composite and deferred ones), partial, covering, functional and
-- trigram indexes. Idempotent: every statement can run again. The design and the
-- reasons are in docs/DESIGN.md §2 (from the schema review).

DO $$ BEGIN
  -- Value checks. Amounts are minor units; the ceiling catches unit mistakes.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_salary_positive') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_salary_positive CHECK (salary_amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_values_check') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_values_check CHECK (
      employee_code ~ '^\S+$'
      AND btrim(full_name) <> '' AND btrim(job_title) <> '' AND btrim(department) <> ''
      AND email ~ '^[^@\s]+@[^@\s]+$'
      AND country_code ~ '^[A-Z]{2}$'
      AND salary_currency ~ '^[a-z]{3}$'
      AND gender IN ('female', 'male', 'non_binary', 'undisclosed')
      AND employment_type IN ('full_time', 'part_time', 'contract')
      AND status IN ('active', 'inactive')
      AND (status = 'inactive') = (deactivated_at IS NOT NULL)
      AND (status = 'inactive') = (deactivation_reason IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_amount_positive') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_amount_positive
      CHECK (amount > 0 AND amount < 1000000000000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_values_check') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_values_check CHECK (
      currency ~ '^[a-z]{3}$'
      AND reason IN ('hire', 'merit', 'promotion', 'market_adjustment', 'correction', 'import', 'currency_change')
      AND (reason = 'correction') = (corrects_revision_id IS NOT NULL)
      AND (reason <> 'import' OR import_id IS NOT NULL)
      AND (cancelled_at IS NULL OR reason <> 'hire'));
  END IF;

  -- Targets for the composite foreign keys below.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_id_employee_date_unique') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_id_employee_date_unique
      UNIQUE (id, employee_id, effective_on);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_cache_target_unique') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_cache_target_unique
      UNIQUE (id, employee_id, amount, currency, effective_on);
  END IF;

  -- History is never deleted with its employee or import (RESTRICT, not CASCADE).
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = 'salary_revisions_employee_id_employees_id_fk' AND confdeltype = 'c') THEN
    ALTER TABLE salary_revisions DROP CONSTRAINT salary_revisions_employee_id_employees_id_fk;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_employee_id_employees_id_fk') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_employee_id_employees_id_fk
      FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_import_id_imports_id_fk') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_import_id_imports_id_fk
      FOREIGN KEY (import_id) REFERENCES imports (id) ON DELETE RESTRICT;
  END IF;

  -- A correction is for the same employee and the same date as what it corrects.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_revisions_corrects_fk') THEN
    ALTER TABLE salary_revisions ADD CONSTRAINT salary_revisions_corrects_fk
      FOREIGN KEY (corrects_revision_id, employee_id, effective_on)
      REFERENCES salary_revisions (id, employee_id, effective_on) ON DELETE RESTRICT;
  END IF;

  -- The cache can only ever hold a real revision of this employee, copied exactly.
  -- Deferred: an employee and its hire revision are inserted in one transaction.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_current_revision_fk') THEN
    ALTER TABLE employees ADD CONSTRAINT employees_current_revision_fk
      FOREIGN KEY (current_revision_id, id, salary_amount, salary_currency, salary_effective_on)
      REFERENCES salary_revisions (id, employee_id, amount, currency, effective_on)
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS employees_code_unique ON employees (employee_code);
CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique ON employees (lower(email));
CREATE INDEX IF NOT EXISTS employees_country_title_idx ON employees (country_code, job_title);
CREATE INDEX IF NOT EXISTS employees_country_department_idx ON employees (country_code, department);
CREATE INDEX IF NOT EXISTS employees_name_trgm_idx ON employees USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS employees_salary_idx ON employees (salary_currency, salary_amount);
-- A two-value column, never used for `status = 'active'`.
DROP INDEX IF EXISTS employees_status_idx;

-- One original per employee per date; later changes on that date are corrections.
CREATE UNIQUE INDEX IF NOT EXISTS salary_revisions_one_original_per_date
  ON salary_revisions (employee_id, effective_on)
  WHERE corrects_revision_id IS NULL AND cancelled_at IS NULL;
-- A revision is corrected at most once: corrections form a chain.
CREATE UNIQUE INDEX IF NOT EXISTS salary_revisions_corrected_once
  ON salary_revisions (corrects_revision_id);
CREATE UNIQUE INDEX IF NOT EXISTS salary_revisions_one_hire
  ON salary_revisions (employee_id) WHERE reason = 'hire';
-- Timeline reads ("latest on or before a date") are index-only.
CREATE INDEX IF NOT EXISTS salary_revisions_timeline_idx
  ON salary_revisions (employee_id, effective_on DESC, created_at DESC)
  INCLUDE (amount, currency) WHERE cancelled_at IS NULL;
-- The daily promotion job looks for revisions that have become due.
CREATE INDEX IF NOT EXISTS salary_revisions_due_idx
  ON salary_revisions (effective_on) WHERE cancelled_at IS NULL;
DROP INDEX IF EXISTS salary_revisions_employee_effective_idx;
CREATE INDEX IF NOT EXISTS salary_revisions_import_idx
  ON salary_revisions (import_id) WHERE import_id IS NOT NULL;
