# Mobile Sign-In Design (MVP)

Issue: AUTH-056

## Goal
Provide a fast, low-risk sign-in flow for mobile contributors during hackathon demos.

## Screen Layout
- Header: "Sign in"
- Inputs: email, password
- Primary action: "Sign in"
- Secondary links: "Forgot password", "Create account"
- Inline status area for validation and network feedback

## States
- Idle: inputs enabled, primary action enabled
- Submitting: primary action disabled, progress text shown
- Success: route to authenticated home
- Failure: keep user on page with actionable error copy

## Guardrails
- Email normalized before submit
- Password is required (non-empty)
- Retry attempts tracked client-side for UX messaging
- Telemetry events: `signin_attempted`, `signin_succeeded`, `signin_failed`
