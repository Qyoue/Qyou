# Phase 1 Smoke Checklist

Use this checklist before a demo, branch review, or deploy preview.

## API

- [ ] `GET /health` returns `200`
- [ ] `POST /auth/register` accepts a valid email and password
- [ ] `POST /auth/login` returns an access token and refresh token
- [ ] `POST /auth/refresh` returns a rotated token pair
- [ ] `GET /locations/nearby` returns at least one location
- [ ] `GET /locations/clusters` returns cluster data for a populated viewport
- [ ] `GET /locations/:id` returns full location details

## Admin Web

- [ ] `/admin/locations` loads without a server error
- [ ] `/admin/locations/map` loads and renders current locations
- [ ] New location creation flow is either functional or clearly marked as non-persistent
- [ ] Seed tooling can be triggered or documented for manual execution

## Mobile

- [ ] Expo app boots without runtime crash
- [ ] Map screen requests nearby locations successfully
- [ ] Selecting a location opens the detail surface
- [ ] Offline network state does not crash the app

## Data

- [ ] MongoDB contains an active location dataset
- [ ] Location geospatial index is present
- [ ] Demo credentials or registration instructions are documented

## Go / No-Go

- [ ] Critical path works: health -> auth -> discover locations -> admin verify
- [ ] Known missing features are communicated before the demo starts
- [ ] A fallback path exists if third-party providers are unavailable
