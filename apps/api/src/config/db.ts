import pg from "pg";
import { QueryTypes, Sequelize, type Transaction } from "sequelize";
import { initModels } from "../models";

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export type DbConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  poolMax?: number;
};

function configFromUrl(connection: string): DbConfig {
  const url = new URL(connection);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    database: decodeURIComponent(url.pathname.slice(1)),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: ["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? ""),
  };
}

export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
  if (env.DATABASE_URL) return configFromUrl(env.DATABASE_URL);
  const required = (name: string) => {
    const value = env[name];
    if (!value) throw new Error(`Missing required environment variable ${name}`);
    return value;
  };
  return {
    host: required("DB_HOST"),
    port: Number(env.DB_PORT ?? 5432),
    database: required("DB_DATABASE"),
    username: required("DB_USERNAME"),
    password: env.DB_PASSWORD ?? "",
    ssl: env.DB_SSL === "true",
  };
}

export type Db = { sequelize: Sequelize; transaction?: Transaction };

export function createDb(config: DbConfig): { db: Db; close: () => Promise<void> } {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: "postgres",
    dialectModule: pg,
    logging: false,
    pool: { max: config.poolMax ?? 5, min: 0, idle: 10_000 },
    dialectOptions: config.ssl ? { ssl: { require: true, rejectUnauthorized: true } } : {},
    define: { freezeTableName: true, underscored: true },
  });
  initModels(sequelize);
  return { db: { sequelize }, close: () => sequelize.close() };
}

export function inTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  if (db.transaction) return fn(db);
  return db.sequelize.transaction((transaction) => fn({ sequelize: db.sequelize, transaction }));
}

export function select<T extends object = Record<string, unknown>>(
  db: Db,
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<T[]> {
  return db.sequelize.query<T>(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction: db.transaction,
  });
}

export async function execute(
  db: Db,
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<void> {
  await db.sequelize.query(sql, { replacements, transaction: db.transaction });
}
