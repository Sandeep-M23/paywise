#!/bin/sh
# Pre-commit gate: format check, typecheck, lint, tests. Exits non-zero on any failure.
# Run it on its own (`npm run check && git commit ...`), never piped: a pipe
# reports the last command's status and hides failures.
set -e
npx prettier --check . >/dev/null
npm run typecheck --silent
npm run lint --silent
npx vitest run --silent >/dev/null
echo "check: ok"
