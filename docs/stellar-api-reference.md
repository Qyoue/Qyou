# Stellar API Endpoints Reference

This document provides complete documentation for the Stellar endpoints exposed by `@qyou/api` (mounted under both `/api/stellar` and `/api/v1/stellar`).

For the machine-readable OpenAPI 3.1.0 specification, see [`apps/api/openapi.json`](../apps/api/openapi.json).  
For the TypeScript DTO definitions, see `@qyou/shared` (`packages/shared/src/types/stellar.types.ts`).

---

## Overview

All Stellar routes require Bearer JWT authentication. When `STELLAR_INCENTIVES_ENABLED=false`, the routes are not mounted and will return `404 Not Found`.

### Base Paths
- `/api/stellar`
- `/api/v1/stellar`

---

## Endpoints

### 1. Link Stellar Wallet
`POST /api/stellar/wallet`

Associates a 56-character Ed25519 Stellar public key (`G...`) with the authenticated user's account.

#### Security
- **Authentication**: `Bearer <jwt_token>` (Required)

#### Request Body
```json
{
  "publicKey": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "wallet": {
    "userId": "usr_abc123",
    "publicKey": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU",
    "createdAt": 1714200000000
  }
}
```

#### Error Responses
- **400 Bad Request**: Public key does not match RFC 4648 Base32 format (`^G[A-Z2-7]{55}$`).
- **401 Unauthorized**: Missing or expired JWT token.
- **409 Conflict**: User already has a linked wallet, or the submitted public key is already registered to another user account (Sybil farming defense).

---

### 2. Fetch Linked Wallet & Balances
`GET /api/stellar/wallet`

Retrieves the authenticated user's linked wallet details and current XLM/token balances.

#### Security
- **Authentication**: `Bearer <jwt_token>` (Required)

#### Response (200 OK)
```json
{
  "success": true,
  "wallet": {
    "userId": "usr_abc123",
    "publicKey": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU",
    "createdAt": 1714200000000
  },
  "balances": {
    "publicKey": "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU",
    "xlm": "250.5000000",
    "balances": [
      {
        "asset": "native",
        "balance": "250.5000000",
        "isNative": true
      }
    ],
    "fetchedAt": 1714200000000,
    "fromCache": true
  }
}
```

#### Error Responses
- **401 Unauthorized**: Missing or expired JWT token.
- **404 Not Found**: User does not currently have a linked Stellar wallet.

---

### 3. Unlink Stellar Wallet
`DELETE /api/stellar/wallet`

Unlinks the user's Stellar wallet. To protect against session hijacking, unlinking requires explicit re-authentication confirmation or password verification.

#### Security
- **Authentication**: `Bearer <jwt_token>` (Required)

#### Request Body
```json
{
  "reauthConfirmed": true
}
```
*or*
```json
{
  "password": "UserCurrentPassword123!"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Stellar wallet unlinked successfully.",
  "unlinkedAt": 1714200000000
}
```

#### Error Responses
- **400 Bad Request**: Re-authentication required (neither password nor `reauthConfirmed: true` provided).
- **401 Unauthorized**: Missing or expired JWT token.
- **404 Not Found**: No linked wallet found to unlink.
