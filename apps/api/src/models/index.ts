// One file per table (PascalCase, like the data models in the Outbox services).
// This barrel is what Drizzle (drizzle.config.ts) and the app import.
export * from "./Employee";
export * from "./Import";
export * from "./SalaryRevision";
