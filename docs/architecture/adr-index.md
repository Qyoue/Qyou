# Architecture Decision Records (ADR) Index

This directory contains Architecture Decision Records (ADRs) for the Qyou blockchain layer.

## What is an ADR?

An ADR documents a significant architectural decision, its context, the options considered,
and the rationale for the chosen approach. ADRs are immutable once accepted — new decisions
supersede old ones rather than editing them.

## Format

Each ADR follows this structure:

```
# ADR-NNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What is the problem or opportunity?

## Decision
What did we decide?

## Consequences
What are the trade-offs?
```

## Index

| ADR | Title | Status | Date |
|---|---|---|---|
| [ADR-001](./adr-001-reputation-anchoring-strategy.md) | Reputation Anchoring Strategy | Accepted | 2026-04-01 |

## Adding a New ADR

1. Create a new file: `adr-NNN-short-title.md` (use the next available number).
2. Follow the format above.
3. Add an entry to this index.
4. Open a PR with the ADR for review.
5. Once merged, the ADR status becomes `Accepted`.
