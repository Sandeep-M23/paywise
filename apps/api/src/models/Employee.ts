import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
  type Sequelize,
} from "sequelize";

export class Employee extends Model<InferAttributes<Employee>, InferCreationAttributes<Employee>> {
  declare id: CreationOptional<string>;
  declare employeeCode: string;
  declare fullName: string;
  declare email: string;
  declare jobTitle: string;
  declare department: string;
  declare countryCode: string;
  declare salaryAmount: number;
  declare salaryCurrency: string;
  declare salaryEffectiveOn: string;
  declare currentRevisionId: string;
  declare gender: CreationOptional<string>;
  declare employmentType: string;
  declare hireDate: string;
  declare status: CreationOptional<string>;
  declare deactivatedAt: Date | null;
  declare deactivationReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  static initModel(sequelize: Sequelize) {
    Employee.init(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: sequelize.literal("gen_random_uuid()"),
        },
        employeeCode: { type: DataTypes.TEXT, allowNull: false },
        fullName: { type: DataTypes.TEXT, allowNull: false },
        email: { type: DataTypes.TEXT, allowNull: false },
        jobTitle: { type: DataTypes.TEXT, allowNull: false },
        department: { type: DataTypes.TEXT, allowNull: false },
        countryCode: { type: DataTypes.CHAR(2), allowNull: false },
        salaryAmount: { type: DataTypes.BIGINT, allowNull: false },
        salaryCurrency: { type: DataTypes.CHAR(3), allowNull: false },
        salaryEffectiveOn: { type: DataTypes.DATEONLY, allowNull: false },
        currentRevisionId: { type: DataTypes.UUID, allowNull: false },
        gender: { type: DataTypes.TEXT, allowNull: false, defaultValue: "undisclosed" },
        employmentType: { type: DataTypes.TEXT, allowNull: false },
        hireDate: { type: DataTypes.DATEONLY, allowNull: false },
        status: { type: DataTypes.TEXT, allowNull: false, defaultValue: "active" },
        deactivatedAt: { type: DataTypes.DATE, allowNull: true },
        deactivationReason: { type: DataTypes.TEXT, allowNull: true },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal("now()"),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal("now()"),
        },
      },
      { sequelize, tableName: "employees", modelName: "Employee" },
    );
  }
}

export type EmployeeRow = InferAttributes<Employee>;
