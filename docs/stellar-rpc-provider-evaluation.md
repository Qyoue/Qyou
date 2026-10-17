# Architecture Decision Record (ADR): Horizon & Soroban RPC Provider Strategy

**Status**: Approved / Decided  
**Date**: September 2026  
**Context**: Issue #1068 — Production Horizon & Soroban RPC infrastructure evaluation  
**Deciders**: Blockchain Engineering, Infrastructure/SRE Team  

---

## 1. Context & Problem Statement

Qyou's backend API and reward distribution services (`@qyou/stellar`) require reliable, low-latency access to the Stellar network (Horizon API for account states, transaction submission, and history; Soroban RPC for smart contract invocation and event streaming).

Currently, local development and staging utilize the Stellar Development Foundation (SDF) public testnet endpoints (`horizon-testnet.stellar.org`, `soroban-testnet.stellar.org`). The SDF public endpoints are strictly unmetered community infrastructure with:
- Strict rate limits (typically 3,600 requests/hour per IP).
- No Service Level Agreement (SLA).
- Unpredictable latency spikes and scheduled maintenance windows.

A formal evaluation and production decision is required prior to mainnet launch.

---

## 2. Evaluated Options

We evaluated three architectural paths:

### Option A: SDF Public Infrastructure (Status Quo)
- **Description**: Route production traffic through `horizon.stellar.org` and public Soroban RPC nodes.
- **Monthly Cost**: $0.
- **Throughput**: ~1 request/second sustained before 429 throttling.
- **SLA**: 0% (Best effort, community support).
- **Pros**: Zero infrastructure management.
- **Cons**: Severe rate limiting, no guarantee of availability during critical queue payout drops, immediate production risk.

### Option B: Managed Third-Party Dedicated RPC Providers
- **Candidates**: Blockdaemon, QuickNode, NowNodes.
- **Description**: Cloud-hosted, fully managed RPC endpoints with dedicated rate limits and geographic routing.
- **Monthly Cost**: $250 – $800 / month depending on request volume.
- **Throughput**: 100 – 1,000 requests/second sustained; elastic burst scaling.
- **SLA**: 99.9% uptime backed by financial SLA and 24/7 on-call provider support.
- **Pros**:
  - Zero server/node maintenance or disk snapshot management.
  - Rapid time-to-market.
  - Multi-region redundancy built-in.
  - Integrated Prometheus monitoring and request analytics.
- **Cons**: Recurring SaaS operating expense; third-party dependency.

### Option C: Self-Hosted Stellar Core + Horizon + Soroban RPC Node
- **Description**: Deploy and operate private Stellar Core (Captive Core mode) and Horizon clusters in Qyou's AWS/GCP VPC.
- **Monthly Cost**: $900 – $1,600 / month (e.g., AWS `m6i.2xlarge` with 8 vCPUs, 32GB RAM, 2TB io2 SSD, plus multi-AZ PostgreSQL database).
- **Throughput**: High internal throughput limited only by local database I/O.
- **SLA**: Self-managed (requires internal 24/7 SRE coverage).
- **Pros**: Complete control, data privacy, zero external rate limits, direct VPC network latency (~2ms).
- **Cons**:
  - High operational burden: Captive Core state sync, ledger catch-up errors, hard fork upgrades, PostgreSQL database index bloat.
  - Requires dedicated blockchain engineering maintenance.
  - Disaster recovery and node re-syncing can take hours during disk corruption.

---

## 3. Comparison Matrix

| Evaluation Criteria | Option A: SDF Public | Option B: Managed RPC (Blockdaemon/QuickNode) | Option C: Self-Hosted Node |
| :--- | :--- | :--- | :--- |
| **Availability SLA** | None (0%) | **99.9% backed** | Self-managed |
| **Rate Limit** | 3,600 req/hr | **100M+ req/mo (Elastic)** | Unlimited |
| **Latency (p95)** | 800 - 2,500 ms | **120 - 300 ms** | **15 - 50 ms (VPC)** |
| **Ops Overhead** | Zero | **Near Zero** | Very High |
| **Monthly Cost** | $0 | **$300 - $600** | $1,100+ |
| **Readiness Time** | Immediate | **1 day** | 2 - 3 weeks |

---

## 4. Decision & Implementation Strategy

### Final Decision: Hybrid Tier-1 Managed RPC Provider with Multi-Provider Failover

1. **Phase 1 (Production Launch)**:
   - Adopt **QuickNode / Blockdaemon** as the **Primary Production Provider**.
   - Configure a secondary managed provider (e.g. NowNodes) as an **Automated Failover Endpoint**.
   - Client configuration in `@qyou/stellar` will automatically switch endpoints when `NetworkHealthTracker` detects consecutive HTTP 5xx errors or latency > 4,000ms.
2. **Phase 2 (High-Volume Scale > 150,000 tx/day)**:
   - Re-evaluate deploying a self-hosted read-only Horizon replica for local query serving, while retaining managed providers for transaction submission and Soroban simulation.

---

## 5. Security & Configuration Requirements

- API keys for third-party RPC providers must be stored in AWS Secrets Manager or HashiCorp Vault.
- Keys must **never** be checked into version control or passed to client-facing browser bundles.
- Web clients (`apps/web`) must query `@qyou/api` proxy endpoints rather than directly calling the paid RPC providers.
