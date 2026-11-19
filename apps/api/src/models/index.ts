import type { Sequelize } from "sequelize";
import { Employee } from "./Employee";
import { Import } from "./Import";
import { SalaryRevision } from "./SalaryRevision";

// One file per table (PascalCase, like the data models in the Outbox services).
export * from "./Employee";
export * from "./Import";
export * from "./SalaryRevision";

/** Registers every model on a Sequelize instance (one per process; one per test file). */
export function initModels(sequelize: Sequelize) {
  Employee.initModel(sequelize);
  Import.initModel(sequelize);
  SalaryRevision.initModel(sequelize);
}
