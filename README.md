# Gather

<p align="center">
  <img src="apps/app/assets/gather-mark.png" width="88" alt="Gather mark" />
</p>

<p align="center">
  <strong>Turn eligible spare change into a transparent, user-controlled devnet allocation.</strong>
</p>

Gather is a web-first demo for a safer kind of automated
roundup: spending data is read-only, funding is explicit, automation is
bounded by a versioned policy, and every simulated allocation is visible in an
auditable ledger.

> **Demo only.** Gather uses Stripe test mode, test USDC, and project-owned
> Solana devnet mirror tokens. It does not trade real securities or xStocks,
> process real deposits, or offer investment services to U.S. persons.

## Why Gather

Most roundup experiences hide the hard parts: what can trigger a purchase,
where the funds came from, and what happens when a portfolio cannot be filled.
Gather makes those constraints product features.

- **Clear money boundaries** — posted purchase data can create a roundup;
  funding is a distinct, confirmed test-mode action.
- **User-owned controls** — set the allocation, rounding rule, per-event,
  daily, and weekly limits, consent duration, and an immediate pause.
- **No silent substitutions** — a full mix stays pending if a leg cannot be
  completed. “Buy what’s ready” is deliberate and manual.
- **Inspectable execution** — a policy-approved allocation records a
  reconciled Solana devnet receipt and visible mirror-token holdings.

## What a reviewer can verify

The intended provider-backed walkthrough is:

1. Social sign-in creates or restores one embedded Solana wallet.
2. A Stripe test connection supplies an eligible posted purchase.
3. The immutable ledger displays the calculated roundup.
4. Test funding is added separately to the Gather wallet.
5. A policy-approved batch allocates to project-owned devnet mirrors and
   reconciles a receipt.
6. The same persisted account is checked again after a full web refresh.

## Repository map

```text
apps/app        Expo Router client; the recorded demo uses its web surface
apps/api        Bun API, PostgreSQL migrations, provider adapters
packages/domain Money, ledger, allocation-policy, and execution rules
packages/ui     Shared cross-platform presentation primitives
docs            Architecture decisions and reviewer material
```

## Run locally

Requirements: [Bun](https://bun.sh/), Docker, and a local PostgreSQL port
available at `5432`.

```sh
bun install
cp .env.example .env.local
docker compose up -d postgres
bun run api:migrate
```

Start the API in one terminal:

```sh
bun run api
```

Start the web client in another:

```sh
bun run web
```

`EXPO_PUBLIC_DEMO_MODE=true` in `.env.local` enables local UI work without
provider credentials. It is not end-to-end evidence.

## Verify

```sh
bun run test
bun run --cwd apps/app lint
bun run --cwd apps/app typecheck
```

The database-backed integration tests require the PostgreSQL service above.

## Safety and scope

Gather is intentionally a constrained demonstration, not a consumer financial
product. Provider secrets stay out of this repository; `.env.example` names
the required configuration without providing credentials. The application must
keep its simulation disclosure visible in every demo and deployment.
