export type AuthConfig = {
  email: string;
  /** "scrypt$<salt b64>$<hash b64>", from `npm run hash-password`. */
  passwordHash: string;
  sessionSecret: string;
  secureCookies: boolean;
  sessionTtlSeconds: number;
};
