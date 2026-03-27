# Phase 1 Demo Runbook

This runbook defines the Phase 1 demo path for the current monorepo baseline. It is designed to be executable on a clean machine and to stay useful even while later product flows are still landing.

## Demo Goal

Show that the system can:

1. start all workspaces locally
2. authenticate through the API
3. discover seeded locations
4. manage locations from the admin surface
5. verify that the backend and frontends are healthy

## Environment Setup

1. Install dependencies from the repo root with `npm install`.
2. Create `.env` files from the documented templates.
3. Ensure MongoDB is running and reachable through `MONGO_URI`.
4. Start the API, admin web, and mobile app from the repo root with `npm run dev`.

## Demo Accounts

Use one seeded admin and one seeded user when available:

- Admin: `admin@qyou.local`
- User: `demo-user-1@qyou.local`

If demo accounts are not seeded yet, use a fresh registration through the API for the mobile or auth demo steps.

## Demo Flow

### Step 1: Verify API health

- Open `http://localhost:4000/health`
- Expect a JSON response with service status and timestamp

### Step 2: Register and log in a user

- Register through `POST /auth/register`
- Log in through `POST /auth/login`
- Capture the returned bearer token for authenticated calls

### Step 3: Discover nearby locations

- Call `GET /locations/nearby` with a demo coordinate set
- Confirm location rows are returned with names, types, and coordinates
- Open one location through the detail endpoint to validate full payload shape

### Step 4: Open the admin web location views

- Visit the admin location list page
- Confirm the list renders seeded or existing locations
- Open the map verification page and confirm markers are visible

### Step 5: Create or seed locations

- Use the admin location seed endpoint or admin location tooling available in the current branch
- Confirm new or updated locations appear in the admin list
- Re-run nearby discovery to verify public API visibility

## Smoke Checklist

- [ ] `npm install` completes from the repo root
- [ ] `npm run dev` starts all configured workspaces
- [ ] `GET /health` returns `200`
- [ ] `POST /auth/register` returns `201`
- [ ] `POST /auth/login` returns access and refresh tokens
- [ ] `GET /locations/nearby` returns location results
- [ ] Admin location list page loads without crashing
- [ ] Admin map page renders the current location dataset
- [ ] Location seed flow or seed script completes successfully

## Known Phase 1 Gaps

These are intentionally outside the current baseline and should not block the demo:

- Queue report submission may not exist yet on all branches
- Queue snapshot aggregation may still be mocked or absent
- Rewards, queue buddy, and reputation flows are Phase 2+ work
- Mobile auth and contribution screens may lag behind API readiness on some branches

## Demo Fallbacks

- If the admin web is unavailable, use the API location endpoints directly.
- If seeded demo accounts are unavailable, register a new account through the auth API.
- If the location seed provider is unavailable, rely on the existing seeded MongoDB dataset.
