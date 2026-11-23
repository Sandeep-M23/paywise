import { describe, expect, it } from "vitest";
import { dbConfigFromEnv } from "../src/config/db";

describe("dbConfigFromEnv", () => {
  it("reads a DATABASE_URL (as hosted Postgres such as Neon provides it)", () => {
    expect(
      dbConfigFromEnv({
        DATABASE_URL:
          "postgresql://paywise:p%40ss%2Fword@ep-x-pooler.sin1.neon.tech/neondb?sslmode=require",
      }),
    ).toEqual({
      host: "ep-x-pooler.sin1.neon.tech",
      port: 5432,
      database: "neondb",
      username: "paywise",
      password: "p@ss/word",
      ssl: true,
    });
  });

  it("uses an explicit port, and no TLS without sslmode", () => {
    expect(
      dbConfigFromEnv({ DATABASE_URL: "postgres://u:p@localhost:5433/paywise" }),
    ).toMatchObject({
      host: "localhost",
      port: 5433,
      ssl: false,
    });
  });

  it("prefers DATABASE_URL over the DB_* variables", () => {
    const config = dbConfigFromEnv({
      DATABASE_URL: "postgres://u:p@url-host/url-db",
      DB_HOST: "db-host",
      DB_DATABASE: "db-db",
      DB_USERNAME: "db-user",
    });
    expect(config).toMatchObject({ host: "url-host", database: "url-db" });
  });

  it("still reads the DB_* variables", () => {
    expect(
      dbConfigFromEnv({
        DB_HOST: "localhost",
        DB_PORT: "5433",
        DB_DATABASE: "paywise",
        DB_USERNAME: "paywise",
        DB_PASSWORD: "paywise",
        DB_SSL: "true",
      }),
    ).toEqual({
      host: "localhost",
      port: 5433,
      database: "paywise",
      username: "paywise",
      password: "paywise",
      ssl: true,
    });
  });

  it("names what is missing", () => {
    expect(() => dbConfigFromEnv({})).toThrow("DB_HOST");
  });
});
