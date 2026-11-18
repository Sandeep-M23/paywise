ALTER TABLE "imports" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "imports" ADD COLUMN "rows" jsonb DEFAULT '[]'::jsonb NOT NULL;