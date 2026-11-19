import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

/** Append-only salary history: a mistake is fixed with a new "correction" revision. */
export class SalaryRevision extends Model<
  InferAttributes<SalaryRevision>,
  InferCreationAttributes<SalaryRevision>
> {
  declare id: CreationOptional<string>;
  declare employeeId: string;
  declare amount: number;
  declare previousAmount: number | null;
  declare currency: string;
  declare effectiveOn: string;
  declare reason: string;
  declare note: CreationOptional<string | null>;
  declare importId: CreationOptional<string | null>;
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
        previousAmount: { type: DataTypes.BIGINT, allowNull: true },
        currency: { type: DataTypes.CHAR(3), allowNull: false },
        effectiveOn: { type: DataTypes.DATEONLY, allowNull: false },
        reason: { type: DataTypes.TEXT, allowNull: false },
        note: { type: DataTypes.TEXT, allowNull: true },
        importId: { type: DataTypes.UUID, allowNull: true },
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
