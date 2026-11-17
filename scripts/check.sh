#!/bin/sh
# Pre-commit gate: format check, typecheck, lint, tests.
set -e
npx prettier --check . >/dev/null
npm run typecheck --silent
npm run lint --silent
npx vitest run --silent >/dev/null
echo "check: ok"
