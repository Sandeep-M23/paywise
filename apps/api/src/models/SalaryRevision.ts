import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

/**
 * Effective-dated salary history: "from effective_on, pay is amount in currency".
 * Append-only: a mistake is fixed by a "correction" pointing at the revision it
 * corrects (same date); only a scheduled revision may be cancelled.
 */
export class SalaryRevision extends Model<
  InferAttributes<SalaryRevision>,
  InferCreationAttributes<SalaryRevision>
> {
  declare id: CreationOptional<string>;
  declare employeeId: string;
  declare amount: number;
  declare currency: string;
  declare effectiveOn: string;
  declare reason: string;
  declare note: CreationOptional<string | null>;
  declare importId: CreationOptional<string | null>;
  declare correctsRevisionId: CreationOptional<string | null>;
  declare cancelledAt: CreationOptional<Date | null>;
  declare createdBy: string;
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize) {
    SalaryRevision.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: sequelize.literal("gen_random_uuid()"),
        },
        employeeId: { type: DataTypes.UUID, allowNull: false },
        amount: { type: DataTypes.BIGINT, allowNull: false },
        currency: { type: DataTypes.CHAR(3), allowNull: false },
        effectiveOn: { type: DataTypes.DATEONLY, allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: false },
        note: { type: DataTypes.TEXT, allowNull: true },
        importId: { type: DataTypes.UUID, allowNull: true },
        correctsRevisionId: { type: DataTypes.UUID, allowNull: true },
        cancelledAt: { type: DataTypes.DATE, allowNull: true },
        createdBy: { type: DataTypes.TEXT, allowNull: false },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal("now()"),
        },
      },
      { sequelize, tableName: "salary_revisions", modelName: "SalaryRevision", updatedAt: false },
    );
  }
}

export type SalaryRevisionRow = InferAttributes<SalaryRevision>;
