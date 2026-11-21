# Security Policy

Qyou handles user accounts and Stellar signing material, so please report vulnerabilities privately.

## Reporting a vulnerability

Use GitHub private vulnerability reporting: open the repository's **Security** tab and choose
**Report a vulnerability** (https://github.com/Qyoue/Qyou/security/advisories/new). Do not open a public
issue, pull request or discussion, and never post secrets, seeds or private keys.

Include the affected component and commit, reproduction steps, the impact you expect, and a proof of concept if you have one.

## Disclosure process

1. **Acknowledgement** within 3 business days.
2. **Triage** within 10 business days: we confirm the issue, assess severity and tell you our plan.
3. **Fix**: we develop and review the fix privately, with a target based on severity (critical: days, others: weeks).
4. **Release and advisory**: we publish a fix and a GitHub Security Advisory, crediting you unless you ask us not to.
5. **Coordinated disclosure**: please wait for the advisory (or 90 days, whichever is first) before disclosing publicly.

## Supported versions

There are no tagged releases yet; fixes land on `main`.

| Version | Supported |
|---|---|
| `main` | Yes |

## Scope

In scope: `apps/api`, `apps/web`, `apps/mobile`, `packages/*`, the Soroban contract in
`packages/stellar/contracts`, and the GitHub workflows. Out of scope: social engineering, physical access,
volumetric denial of service, and third-party services we do not run (Stellar network, Horizon, hosting providers).

## Safe harbour

We will not pursue legal action for good-faith research that follows this policy: use your own accounts or a
local deployment, test against Stellar testnet only, do not access other people's data or funds, and give us
reasonable time to fix an issue before disclosure.
