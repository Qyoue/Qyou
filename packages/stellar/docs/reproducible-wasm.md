# Reproducible WASM build

`packages/stellar/scripts/build-wasm.sh` builds the incentive pool contract deterministically
(pinned toolchain from `rust-toolchain.toml`, `--locked`, fixed `SOURCE_DATE_EPOCH`, path remapping)
and prints its SHA-256.

- `build-wasm.sh --record` writes the hash to `contracts/incentive_pool/WASM_HASH`; commit it with
  any contract or `Cargo.lock` change.
- `build-wasm.sh --check` fails when the build no longer matches the recorded hash (exit 1), or
  exits 2 while `WASM_HASH` still says `UNSET`.
- CI (`contract-build.yml`) builds twice and requires identical hashes, then runs `--check`.
- Size limit: `check-wasm-size.sh` fails above `WASM_MAX_BYTES` (default 131072).

To verify a deployed contract, build at the release tag and compare the printed hash with
`WASM_HASH` and with the on-chain wasm hash.
