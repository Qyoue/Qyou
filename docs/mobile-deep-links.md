# Mobile deep links and universal links

- Custom scheme: `qyou://` (set in `apps/mobile/app.json`). Universal links: `https://links.qyou.example/...`
  (iOS `associatedDomains`, Android `intentFilters` with `autoVerify`). **`links.qyou.example` is a placeholder:**
  replace it in `app.json` and `src/linking/deepLinks.ts` with the real domain.
- Routes (closed set, parsed by `parseDeepLink`): `wallet`, `rewards`, `queue/<id>` (id `[A-Za-z0-9_-]{1,64}`).
  Anything else, other hosts, links with credentials, extra path segments or a different scheme return `null` and must be ignored.
- Hosting requirements (operator task, not in this repository): serve
  `/.well-known/apple-app-site-association` (with the app ID) and `/.well-known/assetlinks.json` (package name and
  signing certificate SHA-256) over HTTPS without redirects.
- Links never carry secrets or perform actions; they only navigate. The wallet signature flow uses its own hook.
