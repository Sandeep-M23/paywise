import pg from "pg";
import { QueryTypes, Sequelize, type Transaction } from "sequelize";
import { initModels } from "../models";

/*
 * PostgreSQL through pg + Sequelize, configured like the Outbox services
 * (outbox-backend-starter shared/config/db.ts): DB_HOST, DB_PORT, DB_DATABASE,
 * DB_USERNAME, DB_PASSWORD, DB_SSL. Any Postgres host works.
 */

// bigint (int8) columns hold money in minor units and counts. pg returns them as
// strings by default; every value we store is far below 2^53, so a JS number is
// exact. Without this, amounts would arrive as strings and compare wrongly.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));

export type DbConfig = {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  /** Connections per process. On Vercel each Function instance holds its own pool. */
  poolMax?: number;
};

export function dbConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DbConfig {
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

/**
 * A database handle: the Sequelize instance, plus the transaction when inside
 * one. Repositories and services take this, so a function works the same in or
 * out of a transaction, and tests can pass an in-process database.
 */
export type Db = { sequelize: Sequelize; transaction?: Transaction };

export function createDb(config: DbConfig): { db: Db; close: () => Promise<void> } {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: "postgres",
    // Passed explicitly so the bundled API (esbuild) doesn't depend on a dynamic require.
    dialectModule: pg,
    logging: false,
    pool: { max: config.poolMax ?? 5, min: 0, idle: 10_000 },
    dialectOptions: config.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    define: { freezeTableName: true, underscored: true },
  });
  initModels(sequelize);
  return { db: { sequelize }, close: () => sequelize.close() };
}

/**
 * Runs `fn` in one transaction: committed if it resolves, rolled back if it throws.
 * Nested calls reuse the outer transaction.
 */
export function inTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  if (db.transaction) return fn(db);
  return db.sequelize.transaction((transaction) => fn({ sequelize: db.sequelize, transaction }));
}

/**
 * A read query with named replacements (`:name`), escaped by Sequelize; user input
 * never becomes SQL text. Returns plain rows with the column names as written.
 */
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

/** A write or DDL statement with named replacements; returns nothing. */
export async function execute(
  db: Db,
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<void> {
  await db.sequelize.query(sql, { replacements, transaction: db.transaction });
}
