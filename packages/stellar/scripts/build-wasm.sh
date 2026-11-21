#!/usr/bin/env bash
# Reproducible release build of the incentive pool contract, and its recorded hash.
#
#   build-wasm.sh            build and print the SHA-256 of the WASM
#   build-wasm.sh --record   build and write the hash to contracts/incentive_pool/WASM_HASH
#   build-wasm.sh --check    build and fail if the hash differs from WASM_HASH
#
# Determinism: pinned toolchain (rust-toolchain.toml), --locked (Cargo.lock), a fixed
# SOURCE_DATE_EPOCH, and path remapping so the build directory does not leak into the binary.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRATE="$ROOT/contracts/incentive_pool"
HASH_FILE="$CRATE/WASM_HASH"
TARGET_DIR="${CARGO_TARGET_DIR:-$CRATE/target}"
WASM="$TARGET_DIR/wasm32-unknown-unknown/release/incentive_pool.wasm"

export SOURCE_DATE_EPOCH=0
export CARGO_TARGET_DIR="$TARGET_DIR"
export RUSTFLAGS="${RUSTFLAGS:-} --remap-path-prefix=$CRATE=/crate --remap-path-prefix=$HOME/.cargo=/cargo"

cargo build --locked --release --target wasm32-unknown-unknown \
  --manifest-path "$CRATE/Cargo.toml"

if command -v sha256sum >/dev/null 2>&1; then
  HASH="$(sha256sum "$WASM" | cut -d' ' -f1)"
else
  HASH="$(shasum -a 256 "$WASM" | cut -d' ' -f1)"
fi
echo "sha256  $HASH  $(basename "$WASM")"

case "${1:-}" in
  --record)
    echo "$HASH" > "$HASH_FILE"
    echo "recorded in $HASH_FILE"
    ;;
  --check)
    RECORDED="$(tr -d '[:space:]' < "$HASH_FILE" 2>/dev/null || true)"
    if [ -z "$RECORDED" ] || [ "$RECORDED" = "UNSET" ]; then
      echo "build-wasm: no recorded hash yet; run with --record and commit WASM_HASH" >&2
      exit 2
    fi
    if [ "$RECORDED" != "$HASH" ]; then
      echo "build-wasm: hash mismatch (recorded $RECORDED, built $HASH)" >&2
      exit 1
    fi
    echo "hash matches the recorded value"
    ;;
esac
