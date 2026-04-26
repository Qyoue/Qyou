# Qyou Admin Web

Next.js admin dashboard for the Qyou platform.

## Prerequisites

- Node.js v18+
- A running instance of `apps/api` (see root README)

## Setup

```bash
# From the repo root
npm install

# Copy env template
cp apps/admin-web/.env.example apps/admin-web/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Running locally

```bash
# From repo root
npm run dev

# Or from this directory
npx next dev
```

Open [http://localhost:3000](http://localhost:3000).

## Component Harness

To preview admin location components in isolation (no full route needed):

```tsx
import AdminLocationHarness from '@/components/admin/AdminLocationHarness';
// Drop <AdminLocationHarness /> anywhere during development
```

The harness renders `LocationCreationForm` and `LocationsDataGrid` side-by-side with toggle controls and surfaces error states inline.

## Project structure

```
src/
  app/          # Next.js App Router pages
  components/
    admin/      # Admin-specific components + harness
```

## Shared contracts

Payload types live in `libs/types`. Do not redefine them inside page or component files.

## Learn More

- [Next.js docs](https://nextjs.org/docs)
- [Root README](../../README.md)
