#!/usr/bin/env bash
# Fails when the release WASM exceeds WASM_MAX_BYTES (default 131072 = 128 KiB).
set -euo pipefail

WASM="${1:-packages/stellar/contracts/incentive_pool/target/wasm32-unknown-unknown/release/incentive_pool.wasm}"
MAX="${WASM_MAX_BYTES:-131072}"

if [ ! -f "$WASM" ]; then
  echo "check-wasm-size: $WASM not found (build it first)" >&2
  exit 1
fi

SIZE=$(wc -c < "$WASM" | tr -d ' ')
echo "incentive_pool.wasm: ${SIZE} bytes (limit ${MAX})"
if [ "$SIZE" -gt "$MAX" ]; then
  echo "check-wasm-size: WASM is ${SIZE} bytes, over the ${MAX} byte limit" >&2
  exit 1
fi
