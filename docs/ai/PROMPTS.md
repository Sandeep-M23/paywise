# AI Usage Log

Tool: Claude Code (agentic CLI). I direct, review and correct; the agent drafts and executes.
This log records the prompts that shaped the project, what I accepted, and what I changed.

## Phase 1: Planning and research

| # | My prompt (summarised) | What the AI produced | My decision / correction |
|---|---|---|---|
| 1 | Pasted the assessment brief; asked for an `.md` plan of action | First plan, backend-agnostic, SQLite | Fixed the stack myself: Node/TS, Next.js + shadcn + Tailwind + Jotai, PostgreSQL, Recharts, Vercel |
| 2 | "Currency: store it how Stripe does" | Integer minor units + ISO code, exponent map (JPY 0, KWD 3) | Accepted. Added the rule "no floats in the money path" to `CLAUDE.md` |
| 3 | "Also use TanStack Query" | Split state: Jotai for UI, TanStack Query for server data | Accepted; dropped `jotai-tanstack-query` to keep one clear pattern |
| 4 | Research other public submissions of this assessment and which were selected | ~150+ repos found; baseline vs. differentiators | AI confirmed selection data is **not public** rather than guessing. I asked for a plainer explanation, then a strategy |
| 5 | Research real HR problems, then a broader search + a CSV import feature | 12 sourced HR problems; CSV import UX/security research | Accepted. Chose 5 features tied to problems; set a cut order (`docs/RESEARCH.md`) |
| 6 | "Write RESEARCH.md and update PLAN.md", then "let's start" | Docs, requirements, design, this log | Reviewed scope: soft delete, `employee_code` as import key, skip-error-rows policy |

## Corrections log (where AI output needed fixing)
- The pasted brief was truncated in places; the AI flagged it instead of inventing the missing constraints.
- pnpm via corepack failed (signature-key bug) → switched to npm workspaces rather than working around it.
- Gender vs. export conflict: the requirements say gender is never exported, but export must round-trip into import. Resolved by making `gender` an optional import column (updates keep the stored value). Recorded in `DESIGN.md`.
