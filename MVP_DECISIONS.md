# Roundup MVP decisions

This is the current implementation source of truth. Earlier planning drafts are historical where they disagree with this document.

## Product boundary

- Roundup is the temporary product name.
- Web ships first. iOS follows from shared React Native code.
- The MVP is a real Stripe-sandbox and Solana-devnet demonstration. It does not offer real securities trading or represent demo tokens as xStocks.
- Every test screen and receipt must visibly identify test bank data, test USDC, and devnet stock-mirror tokens.

## Platform and persistence

- Use a Bun workspace monorepo.
- Use React Native with Expo and Expo web for the shared client.
- Share semantic design tokens and a local cross-platform primitive API; use
  React Native as the default renderer and isolate true platform differences in
  `.web` and `.native` leaves. See
  [`docs/adr/0001-cross-platform-ui-primitives.md`](docs/adr/0001-cross-platform-ui-primitives.md).
- Use PostgreSQL for durable server-side records.
- Support Google, Apple, and GitHub sign-in.
- Use Privy as the single identity and embedded-wallet provider.

## Wallets

- Create one embedded Solana wallet automatically during first-sign-in onboarding.
- Auto-execution requires explicit user consent to a Privy delegated signer and must be constrained by policy limits, allowlists, and expiry. It must never rely on an unrestricted server key.
- The embedded wallet is the source of automatic purchases.
- Private-key export is available only in Settings, after a security warning and re-authentication.
- Imported wallets are read-only in the MVP. Ownership is proved once; only newly observed activity is considered.
- Outgoing SOL or USDC from an imported wallet can create a roundup entry. Network fees and transfers to the user's proven wallets are excluded.
- A user may initiate a prefilled, one-click transfer from an imported wallet to the embedded wallet, but they sign it themselves.

## Bank data and funding

- Stripe Financial Connections is the only demo bank integration.
- It is read-only: linked bank activity creates potential roundup entries but never grants unattended debit authority.
- Stripe test mode provides the user-approved demo funding action for placing test USDC in the embedded wallet. Funding is excluded from roundups.
- Use posted transactions for final roundups. Pending activity may be shown as an estimate only. Refunds before investment reduce the pending roundup; refunds afterward never trigger an automatic sale.
- Default eligible bank activity is merchant/card spending. Exclude transfers, card payments, cash withdrawals, onramp/funding activity, and other self-movements; permit manual inclusion.

## Roundup and auto-invest policy

- Default rule: round each eligible purchase to the next whole dollar at 1x. Let users choose a multiplier or fixed extra contribution.
- The user opts into auto-invest. It runs when the accumulated roundup reaches the selected minimum, subject to daily and weekly caps.
- Onboarding guides the user through minimum and maximum settings with conservative defaults.
- Default allocation is the user's target mix. All legs must be ready before an automatic batch executes; otherwise keep the batch pending and explain the blocking leg.
- "Buy what's ready" is a manual alternative, and users may opt into it in Settings.
- Allocation changes default to preserving auto-invest enabled. Changes that expand authority require a new confirmation; reductions and Pause apply immediately.

## Demo execution

- Generate clearly named, no-value Token-2022 devnet stock mirrors (for example, `AAPL Devnet Demo`).
- An execution adapter converts an approved, funded purchase batch into the appropriate devnet allocations and produces a receipt.
- Keep the execution adapter replaceable. A real issuer/broker integration is a separately authorized future product path.

## First end-to-end vertical slice

1. Social sign-in creates the embedded wallet.
2. A user connects a Stripe Financial Connections test account read-only.
3. A posted test purchase is ingested and creates an immutable roundup entry.
4. A user funds the embedded wallet through a separate Stripe test-mode action.
5. The policy threshold is reached and an approved batch auto-allocates devnet stock mirrors.
6. Activity, policy state, receipt, and holdings reconcile from persisted records and Solana devnet state.

## Intentionally unresolved before provider integration

- Exact Stripe funding implementation in test mode.
- Exact devnet stock-mirror minting and allocation mechanics.
