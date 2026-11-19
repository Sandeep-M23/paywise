import { createPgDb } from "../../config/db";
import { requireEnv } from "../../config/env";
import { generateEmployees } from "./generate";
import { seedDatabase } from "./seed";

// Fixed reference date and seed: every run produces identical data.
const SEED = 42;
const REFERENCE_DATE = "2026-11-15";
const count = Number(process.env.SEED_COUNT ?? 10_000);

const started = performance.now();
const people = generateEmployees({ count, seed: SEED, today: REFERENCE_DATE });
const generated = performance.now();

const { db, close } = createPgDb(requireEnv("DATABASE_URL"));
await seedDatabase(db, people);
await close();

const done = performance.now();
console.log(
  `Seeded ${people.length} employees (generate ${Math.round(generated - started)} ms, insert ${Math.round(done - generated)} ms)`,
);
