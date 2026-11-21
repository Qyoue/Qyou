# Soroban invocation, TTL and trustlines (#1123-#1126)

Code: `packages/stellar/src/contracts/soroban-invoker.ts`. It is not yet wired into
`contracts/client.ts` / `incentive-pool.ts`; those still describe an in-memory harness.

- **#1123 RPC client.** `invokeContract(rpc, tx, signer, opts)` runs simulate, prepare, sign,
  send and polls `getTransaction`. Pass an `rpc.Server` from `@stellar/stellar-sdk`. The required
  integration test (testnet or local Quickstart) is **not** included.
- **#1124 Fees and footprint.** The transaction sent is the output of `prepareTransaction`, which
  carries the footprint, auth entries and resource fee. A configurable buffer (default 15%) is added
  and `maxFeeStroops` is a hard ceiling that fails with `FEE_TOO_HIGH`.
- **#1125 TTL.** `buildExtendTtlOp` builds an `extendFootprintTtl` operation; add it to the
  deposit/distribute transactions. A scheduled bump job and the low-TTL alert should use
  `isTtlLow(status, thresholdLedgers)`; the job and alert wiring are **not** included.
- **#1126 Trustline.** `qyouAsset(config, network)` resolves the issuer per network,
  `buildChangeTrustOp` creates the trustline operation, and `assertTrustline` throws
  `MissingTrustlineError` before payout. Config shape: `{ code: 'QYOU', issuers: { testnet: 'G…', mainnet: 'G…' } }`.

Nothing here has been compiled or run against a network.
