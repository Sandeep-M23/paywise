# Security

Paywise holds salary data for 10,000 people, so the bar is "safe for a public demo URL with one HR user", not enterprise IAM. **Status:** Built = in the code today; Planned = revision 2 (`PLAN.md` §3.8).

## Threat model (what we defend against)

| Threat                                   | Defence                                                                                                                                                                                       | Status                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Anonymous access to salaries             | Every API route requires a valid session except `/health` and `/auth/login`                                                                                                                   | Built                                                             |
| Stolen or guessed password               | scrypt (random salt) hash in env; constant-time compare; the hash runs even for an unknown email (no timing oracle)                                                                           | Built                                                             |
| Password guessing                        | 5 failed logins per email + IP per 15 minutes → 429 with `Retry-After`; counters in Postgres                                                                                                  | Planned                                                           |
| Session theft via script                 | Cookie is `HttpOnly`; `Secure` in production; HMAC-signed with `SESSION_SECRET`; 8-hour expiry                                                                                                | Built                                                             |
| Cross-site request forgery               | `SameSite=Lax` (cookie not sent on cross-site POSTs) **and** an `Origin` / `Sec-Fetch-Site` check plus `application/json` requirement on state-changing requests                              | Lax built; Origin check planned                                   |
| Cross-origin cookie problems             | The web app proxies `/api/*`, so there is one origin and no CORS                                                                                                                              | Built                                                             |
| SQL injection                            | Bound parameters (Drizzle today; Sequelize named replacements after revision 2.1); whitelisted sort columns; Ask Paywise maps text to enum plans, never to SQL                                | Built (Ask planned)                                               |
| CSV formula injection in exports         | Cells starting with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'` (OWASP)                                                                                                               | Built                                                             |
| Oversized uploads                        | 4.4 MB body limit and 10,000 rows → 413                                                                                                                                                       | Built                                                             |
| Duplicate or replayed imports            | `Idempotency-Key` + request hash                                                                                                                                                              | Planned                                                           |
| Salary data in logs                      | Structured request logs (method, route, status, duration, request id); bodies, cookies and salary values are never logged                                                                     | Planned (today only unexpected errors are logged, without bodies) |
| Clickjacking, MIME sniffing              | `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, a CSP                                                                                            | Planned                                                           |
| Silent history changes                   | Revisions are append-only; `audit_logs` written in the same transaction as each change; a trigger rejects `UPDATE`/`DELETE` on audit rows; production DB role has `INSERT, SELECT` only on it | Planned                                                           |
| Re-identifying people through statistics | Gender aggregates suppressed when either group is under 5; gender never listed or exported                                                                                                    | Built                                                             |

## Authorization

v1 has one role, `hr_admin`, held by the single configured account. Services still call `authorize(actor, action)` for sensitive actions (change salary, override currency, import, apply a raise plan, deactivate, read the audit log), so adding roles later means changing one policy function. Tests cover a non-admin actor being refused. **Planned.**

## Assumptions and limitations

- **One shared HR account.** The audit log records "hr@acme.test", not a person. Multiple users, SSO and per-person accountability are v2.
- **Stateless sessions.** There is no server-side session store, so a session can't be revoked individually; rotating `SESSION_SECRET` signs everyone out.
- **Audit integrity** protects against the application, not against someone with database-owner access. Off-site, append-only log shipping would be the next step.
- **Rate limiting** is per email + IP in Postgres. A distributed attack across many IPs is better handled by the platform (Vercel Firewall rules).
- **Data:** every environment, including the deployed demo, uses the synthetic seed. Reviewer credentials are shared out of band, never committed.
- **Secrets:** `HR_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET` and the database settings (`DATABASE_URL` today; `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` after revision 2.1) live in Vercel environment variables; `.env` files are git-ignored.
- **Not covered:** encryption at rest beyond the Postgres host's defaults, field-level encryption of salaries, data retention and erasure (GDPR) flows.
