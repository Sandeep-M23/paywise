-- Applied by `npm run db:sync` BEFORE sequelize.sync(), for existing databases
-- only: fills in new NOT NULL columns so sync can add the constraint. Idempotent;
-- on an empty database it does nothing (the tables don't exist yet).

DO $$ BEGIN
  IF to_regclass('public.salary_revisions') IS NOT NULL THEN
    ALTER TABLE salary_revisions ADD COLUMN IF NOT EXISTS created_by text;
    UPDATE salary_revisions SET created_by = 'system' WHERE created_by IS NULL;
  END IF;

  IF to_regclass('public.employees') IS NOT NULL THEN
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_revision_id uuid;
    ALTER TABLE employees ADD COLUMN IF NOT EXISTS salary_effective_on date;
    -- Before revision 2 no revision could be in the future, so the latest one is current.
    UPDATE employees e
    SET current_revision_id = c.id, salary_amount = c.amount,
        salary_currency = c.currency, salary_effective_on = c.effective_on
    FROM (
      SELECT DISTINCT ON (employee_id) employee_id, id, amount, currency, effective_on
      FROM salary_revisions
      ORDER BY employee_id, effective_on DESC, created_at DESC
    ) c
    WHERE e.id = c.employee_id AND e.current_revision_id IS NULL;
  END IF;
END $$;
