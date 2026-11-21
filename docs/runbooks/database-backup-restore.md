# Database backup and restore runbook

Scope: the PostgreSQL database behind `@qyou/api` (Prisma, `DATABASE_URL`). Stellar accounts and the
incentive pool contract live on-chain and are not covered here (see `docs/stellar-key-disaster-recovery.md`).

## Targets

| Objective | Target |
|---|---|
| RPO (data you can lose) | 24 hours with the nightly dump; use point-in-time recovery for less |
| RTO (time to restore) | 1 hour for a database under 10 GB |
| Retention | 7 daily, 4 weekly, 3 monthly dumps; keep encrypted copies off the database host |

These are proposed defaults: confirm them with the service owner and adjust.

## Taking a backup

```bash
# Custom-format dump (compressed, restorable selectively). DATABASE_URL must not include "?schema=".
pg_dump --format=custom --no-owner --file "qyou-$(date -u +%Y%m%dT%H%M%SZ).dump" "$DATABASE_URL"
sha256sum qyou-*.dump > SHA256SUMS
```

1. Run it from a host that can reach the database but is not the database host.
2. Encrypt before storing off-host (for example `age` or `gpg`); never keep an unencrypted dump in shared storage.
3. Upload the dump and its checksum to the backup bucket, then record the date and size in the ops log.
4. For finer RPO enable continuous WAL archiving (managed Postgres point-in-time recovery) and note its retention window.

## Restoring

Always restore into a **new** database first and verify before switching traffic.

```bash
createdb qyou_restore
pg_restore --no-owner --dbname qyou_restore qyou-YYYYMMDDTHHMMSSZ.dump
```

1. Stop or scale down the API so nothing writes during the cutover.
2. Verify checksums (`sha256sum -c SHA256SUMS`) before restoring.
3. Restore into `qyou_restore`; check row counts of key tables (`User`, wallets, rewards, queue tables) against the last known values.
4. Apply any newer migrations: `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma` against the restored database.
5. Point `DATABASE_URL` at `qyou_restore`, start the API, run the post-deploy smoke test, then retire the damaged database.
6. After a restore from an older backup, run the reward reconciliation job (see `docs/runbooks/stuck-pending-rewards.md`) to find payouts made after the backup point.

## Verification and drills

- Restore the latest backup into a scratch database every month and record the elapsed time against the RTO.
- A backup that has never been restored is not a backup: log each drill in `docs/runbooks/drills.md`.
- Alert if the newest dump is older than 26 hours.

## Local development

With `docker-compose.yml`: `docker compose exec postgres pg_dump -U qyou -Fc qyou > local.dump`, and
`docker compose exec -T postgres pg_restore -U qyou -d qyou --clean --no-owner < local.dump`.
