# Web Email Verification Experience (AUTH-041..044)

## Target flow
1. User opens web auth screen and enters verification token.
2. Client validates token shape before network request.
3. Client calls `POST /api/v1/auth/verify`.
4. Success shows verified state and account email.
5. Invalid/expired token shows safe generic error.
6. Network failure shows retriable error.

## Boundaries
- Web handles UX state and inline validation only.
- API remains source of truth for token validity, expiry, and activation state.

## Contract
- Request: `{ token: string }`
- Success: `{ ok: true, accountId: string, email: string }`
- Failure: `{ ok: false, code: string, message: string }`

## Instrumentation checkpoints
- `VERIFY_ATTEMPT`
- `VERIFY_OK`
- `VERIFY_ERROR`

## Verification notes
- From `/login`, open reset/verification section.
- Try invalid token length and verify client-side guardrail.
- Try invalid token value and verify generic failure state.
- Try valid token and verify success state.
