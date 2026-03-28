# Qyou API Contract (v1)

This document defines the MVP contract that Qyou apps use to communicate with the backend.
It is intentionally minimal and can be extended without breaking existing clients.

## Response Envelope

All endpoints return one of:

- Success: `{ success: true, data: <payload> }`
- Failure: `{ success: false, error: { code, message } }`

The canonical TypeScript shapes live in `@qyou/types`.

## Auth

### `POST /auth/register`

Request:
- `email: string`
- `password: string`

Response (success):
- `userId: string`
- `email: string`

### `POST /auth/login`

Request:
- `email: string`
- `password: string`
- `deviceId?: string`

Response (success):
- `accessToken: string`
- `refreshToken: string`
- `deviceId: string`

### `POST /auth/refresh`

Request:
- `refreshToken: string`

Response (success):
- `accessToken: string`
- `refreshToken: string`
- `deviceId: string`

## Locations

### `GET /locations/nearby`

Query:
- `lat: number`
- `lng: number`
- `radiusInMeters?: number` (default `2000`)
- `limit?: number` (default `50`, max `200`)
- `typeFilter?: LocationType`

Response (success):
- `source: "mongodb" | "redis"`
- `count: number`
- `items: Array<{ _id, name, type, address, status, location, distanceFromUser }>`

### `GET /locations/clusters`

Query:
- `neLat: number`, `neLng: number`, `swLat: number`, `swLng: number`
- `zoomLevel: number` (1..22)
- `typeFilter?: LocationType`
- `limit?: number`

Response (success):
- `zoomLevel: number`
- `bbox: { neLat, neLng, swLat, swLng }`
- `count: number`
- `items: Array<Cluster | Point>`

### `GET /locations/:id`

Response (success):
- `item: Location`

## Queues (MVP target)

### `POST /queues/report`

Request:
- `locationId: string`
- `waitTimeMinutes?: number`
- `level: "none" | "low" | "medium" | "high" | "unknown"`
- `notes?: string`

Response (success):
- `report: QueueReport`
- `snapshot: QueueSnapshot`

### `GET /queues/:locationId/history`

Response (success):
- `locationId: string`
- `windowStart: string` (ISO)
- `windowEnd: string` (ISO)
- `points: Array<{ at: string, level: string, waitTimeMinutes?: number }>`
- `trend: "up" | "down" | "flat" | "unknown"`

## Rewards (MVP target)

### `GET /rewards/balance`

Response (success):
- `balance: RewardBalance`

### `GET /rewards/history`

Response (success):
- `items: RewardTransaction[]`

### `POST /rewards/claim`

Request:
- `amount: number`

Response (success):
- `transaction: RewardTransaction`

