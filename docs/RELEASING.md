# Release process and versioning

The monorepo uses [changesets](https://github.com/changesets/changesets). All workspaces are private,
so versions and changelogs are bumped and git-tagged, not published to npm.

## Contributing a change

1. Run `npm run changeset`, select the affected workspaces and the bump:
   - **patch**: fixes and internal changes,
   - **minor**: backwards-compatible features,
   - **major**: breaking changes (API contract, shared types, env vars, contract ABI).
2. Commit the generated `.changeset/*.md` with your PR. Changes with no user-visible effect (docs, CI) need none.

## Cutting a release

1. Merging changesets to `main` makes the `Release` workflow open a "Version Packages" PR that bumps each
   workspace version and updates its `CHANGELOG.md`.
2. Review and merge that PR. The workflow then tags the merge commit (`@qyou/api@x.y.z`, ...).
3. Tagging `vX.Y.Z` on `main` triggers the production deploy workflow (`deploy-production.yml`), which still
   needs approval on the `production` environment.

## Rules

- The shared packages (`@qyou/shared`, `@qyou/error-codes`, `@qyou/stellar`) bump **major** for any breaking change,
  and dependants get a patch bump automatically (`updateInternalDependencies`).
- Contract changes also record the new WASM hash (`packages/stellar/docs/reproducible-wasm.md`).
