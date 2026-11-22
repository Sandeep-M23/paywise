import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import type { AuthConfig, DecodedToken, UserToken } from "../../interfaces/middlewares/auth";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyHashedPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const generateToken = (user: UserToken, config: AuthConfig): string =>
  jwt.sign({ user }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.tokenTtlSeconds,
  });

export const verifyToken = (token: string, config: AuthConfig): DecodedToken =>
  jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as DecodedToken;
