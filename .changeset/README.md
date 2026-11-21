# Changesets

Every pull request that changes a workspace's behaviour adds a changeset: run `npm run changeset`, pick the
affected packages and the bump (patch, minor, major) and write a one-line summary. The file is committed
with the PR. See `docs/RELEASING.md`.
