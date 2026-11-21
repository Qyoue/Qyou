#!/usr/bin/env bash
# Runs the quickstart integration suite (packages/stellar/tests/integration) and
# fails the job when any test is skipped, cancelled or when no test ran at all.
# A skipped integration test is a silent gap, so it is treated as a failure.
set -uo pipefail

LOG="$(mktemp)"
echo "Running Quickstart CI Suite"

npm run test:integration -w @qyou/stellar 2>&1 | tee "$LOG"
STATUS=${PIPESTATUS[0]}

# node:test summary lines: "# tests N", "# pass N", "# skipped N", "# todo N", "# cancelled N"
count() { grep -E "^# $1 " "$LOG" | tail -1 | awk '{print $3}'; }
TESTS="$(count tests)"; SKIPPED="$(count skipped)"; TODO="$(count todo)"; CANCELLED="$(count cancelled)"

echo "quickstart summary: tests=${TESTS:-0} skipped=${SKIPPED:-0} todo=${TODO:-0} cancelled=${CANCELLED:-0}"

if [ "$STATUS" -ne 0 ]; then
  echo "quickstart suite failed (exit $STATUS)" >&2
  exit "$STATUS"
fi
if [ "${TESTS:-0}" -eq 0 ]; then
  echo "quickstart suite ran no tests" >&2
  exit 1
fi
if [ "${SKIPPED:-0}" -gt 0 ] || [ "${TODO:-0}" -gt 0 ] || [ "${CANCELLED:-0}" -gt 0 ]; then
  echo "quickstart suite has skipped, todo or cancelled tests; failing" >&2
  exit 1
fi
