import type { ImportPreviewRow } from "@paywise/shared";
import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export class Import extends Model<InferAttributes<Import>, InferCreationAttributes<Import>> {
  declare id: CreationOptional<string>;
  declare filename: string;
  declare rowCount: number;
  declare createdCount: number;
  declare updatedCount: number;
  declare skippedCount: number;
  declare status: CreationOptional<string>;
  declare createdBy: string | null;
  declare rows: ImportPreviewRow[];
  declare createdAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize) {
    Import.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: sequelize.literal("gen_random_uuid()"),
        },
        filename: { type: DataTypes.TEXT, allowNull: false },
        rowCount: { type: DataTypes.INTEGER, allowNull: false },
        createdCount: { type: DataTypes.INTEGER, allowNull: false },
        updatedCount: { type: DataTypes.INTEGER, allowNull: false },
        skippedCount: { type: DataTypes.INTEGER, allowNull: false },
        status: { type: DataTypes.TEXT, allowNull: false, defaultValue: "committed" },
        createdBy: { type: DataTypes.TEXT, allowNull: true },
        rows: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal("now()"),
        },
      },
      { sequelize, tableName: "imports", modelName: "Import", updatedAt: false },
    );
  }
}

export type ImportRow = InferAttributes<Import>;
