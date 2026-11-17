#!/bin/sh
# Pre-commit gate: format check, typecheck, lint, tests. Exits non-zero on any failure.
# Run it on its own (`npm run check && git commit ...`), never piped: a pipe
# reports the last command's status and hides failures.
set -e
# A literal U+FEFF in source is invisible and has bitten us twice; use the \uFEFF escape.
if grep -rl "$(printf '\357\273\277')" apps packages --include='*.ts' --include='*.tsx' --exclude-dir=node_modules; then
  echo "error: literal BOM character in the files above" && exit 1
fi
npx prettier --check . >/dev/null
npm run typecheck --silent
npm run lint --silent
npx vitest run --silent >/dev/null
echo "check: ok"
