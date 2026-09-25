# Roundup milestones

Use this document as the operating plan across sessions. Update the status and
evidence in the same change that completes a milestone. Do not mark a milestone
complete based only on source code; record the test, rendered surface, or
provider result that proves it.

## Non-negotiable verification gate

An agent may mark a milestone **Complete** only after it records all applicable
evidence below in that milestone. "It compiles," a screenshot of static UI, a
local fixture, or a mocked provider response is never sufficient for a provider
or execution milestone.

1. **Automated checks:** Add and run focused unit tests for deterministic rules
   plus integration tests for the new adapter/state transition. Record the exact
   command and outcome.
2. **Real test environment:** Exercise the actual provider sandbox or Solana
   devnet using its test credentials and real webhook/RPC/transaction behavior.
   A mock may supplement tests, but cannot be the acceptance run.
3. **End-to-end flow:** Run the whole affected user journey through the served
   web app and an iOS development build when the milestone touches a mobile
   flow. Verify the persisted result after refresh/restart, not only an
   optimistic client state.
4. **Visual gate:** Inspect the rendered screen at desktop web and iPhone-sized
   layouts against the latest approved Roundup design/reference. Verify loading,
   empty, error, blocked, and success states are legible and do not misstate
   test data as real funds or securities.
5. **Evidence record:** Add the date, environment, commands, pass/fail result,
   redacted provider/transaction identifiers where relevant, and any remaining
   limitation under the completed milestone. If any required check is missing,
   status remains `In progress`.

## Product guardrails

- This MVP is a Stripe-sandbox plus Solana-devnet demo. It never claims to buy
  real securities, use real bank activity, or issue xStocks.
- Stripe Financial Connections is read-only. Funding is a separate,
  user-confirmed action and must never create a roundup.
- Privy owns social sign-in and the embedded Solana wallet. Automation requires
  explicit consent plus bounded policy controls; no unrestricted server key.
- Imported wallets are read-only. The embedded wallet funds automatic batches.
- Preserve the strict full-mix behavior by default: if one leg cannot execute,
  the automatic batch stays pending. "Buy what's ready" is opt-in and manual.

## Current baseline

| Item | Status | Evidence |
| --- | --- | --- |
| Product and domain decisions | Complete | `MVP_DECISIONS.md` and `CONTEXT.md` |
| Bun monorepo foundation | Complete | Root `package.json` uses Bun 1.3.14 |
| Shared universal client | Complete | `apps/app` is Expo Router app with web and iOS scripts |
| Browser demo shell | Foundation complete; provider E2E deferred to M9 | `apps/app/src/app/index.tsx` exports and renders a local preview only; it is not provider-backed acceptance evidence |
| Live providers and persistence | Not started | No Privy, Stripe, database, or Solana secrets are currently configured |

## Milestone 1 — Universal client foundation

**Status:** Complete — shared app, web rendering, and iOS simulator launch proof are complete

**Scope**

- Expo Router application in `apps/app`, runnable as web and iOS from the same
  codebase.
- A clearly labeled local demo loop used only to prove navigation and state
  presentation; no misleading live-provider claims.
- Bun root commands and lint/type-check scripts.

**Completion evidence**

- `bun run typecheck` passes from the repository root at the M1 foundation
  baseline; the later Privy declaration-recursion issue is recorded in M2.
- `bunx expo lint` passes in `apps/app`.
- `bunx expo export --platform web` creates `apps/app/dist`.
- Served web build is visually inspected at desktop and iPhone-sized viewports.
- An iOS simulator development build launches and renders the same route
  without native startup or navigation regressions. Physical-device visual
  acceptance is deferred to M9.
- This milestone deliberately has no provider-backed financial flow. Its local
  controls cannot be cited as end-to-end proof for any later milestone.

**Evidence record — 2026-09-23**

- Passed: `bun run typecheck` from the repository root.
- Passed: `bunx expo lint` in `apps/app`.
- Passed: `bunx expo export --platform web` in `apps/app`.
- Passed: served `apps/app/dist` in a browser; verified the local preview state
  changes through spend → funding → allocation.
- Passed: the iOS simulator development build launches the same Google sign-in
  route without native startup errors. Final physical-device visual inspection
  and comparison against a user-approved universal-app design reference are
  consolidated into the Milestone 9 device-acceptance run.

## Milestone 2 — Privy identity and embedded wallet

**Status:** Complete — web provider acceptance, lifecycle coverage, and native simulator proof are complete

**Scope**

- Configure and verify Google/OAuth in Privy on web and iOS.
- Create one Solana embedded wallet on first sign-in and show its public
  address.
- Put private-key export in web Settings behind re-authentication and an
  explicit warning. Do not implement export in onboarding.
- Keep Apple/GitHub provider configuration and the final multi-provider
  redirect matrix for Milestone 9. Keep read-only external-wallet ownership
  proof and durable tracking for Milestone 3.

**Prerequisites**

- Privy app ID for web and iOS redirect URLs.
- `EXPO_PUBLIC_PRIVY_APP_ID` set locally. This same public identifier is reused
  by the future API; the server-only Privy app secret is separate. Privy's
  per-client configuration is enabled: set both `EXPO_PUBLIC_PRIVY_WEB_CLIENT_ID`
  and `EXPO_PUBLIC_PRIVY_IOS_CLIENT_ID` locally, and keep the registered web
  origin, iOS bundle ID, and URL scheme aligned with the Expo configuration.
- Google enabled in Privy with matching redirect configuration for local web
  and the iOS development build.

**Completion evidence**

- Automated Google auth/wallet lifecycle tests pass, including first-login
  idempotency.
- A fresh user can sign in with Google on web; the iOS simulator development
  build reaches the protected OAuth handoff. The complete native sign-in,
  redirect, and wallet acceptance run is deferred to Milestone 9.
- Exactly one embedded devnet wallet is created and restored after sign-out/in;
  its public address is shown on web. The corresponding physical-iPhone
  display is part of the final Milestone 9 device-acceptance run.
- Agent verifies the Google login, wallet, and export-warning on rendered web
  surfaces; no provider response is mocked in the acceptance run. The complete
  iPhone screen set, including failed-login handling, is part of the final M9
  device-acceptance run.

**Working evidence — 2026-09-23**

- Configured separate Privy development clients for the registered local web
  origin and the iOS bundle identifier/URL scheme. Privy is set to create a
  Solana embedded wallet automatically, with EVM wallet creation disabled.
- Added platform-specific Privy providers: `@privy-io/react-auth` on web and
  `@privy-io/expo` on native. The served web app at `http://localhost:8081`
  renders the Roundup social sign-in screen without initiating OAuth.
- Passed `bun run lint` and `bunx expo export --platform web` in `apps/app`.
  `bun run typecheck` is currently blocked by a stack overflow in the Privy
  package declaration graph (reproduced with TypeScript 5.9 and 6.0).
- Google OAuth was acceptance-tested against the served app at
  `http://localhost:8081`. The Google client’s Privy callback was registered,
  the real Google chooser and consent screen completed, and the returned
  account received exactly one embedded Solana address. After sign-out and a
  second Google login, the same address was restored. The rendered Settings
  screen showed the explicit key-safety warning and the Google re-authentication
  gate; no private key was requested or exposed.
- Apple and GitHub are deliberately deferred to Milestone 9. Physical-iPhone
  launch, sign-in, wallet-address, and layout proof are consolidated into the
  final Milestone 9 device-acceptance run.
- Simulator proof: installed the generated native app in an iPhone 17 Pro
  (iOS 26.5) simulator. It renders the Roundup Google sign-in screen without
  native startup errors; its button opens the iOS protected OAuth handoff and
  the real Google sign-in page for `privy.io`. This proves the native bundle,
  layout, and pre-auth handoff only. It does not replace the required physical
  iPhone sign-in, redirect, wallet, and post-relaunch acceptance run.
- Added `bun test` coverage for the Google embedded-wallet lifecycle: a first
  login requests creation once, a created wallet prevents a duplicate request,
  and a later Google login restores the existing embedded Solana wallet. Four
  tests pass. These tests cover application lifecycle decisions; the real
  provider acceptance evidence remains the served web run and the final M9
  physical-device run.
- Declared the Expo `usesAppleSignIn` capability and
  `expo-apple-authentication` config plugin for the iOS development build;
  the entitlement is configuration-only until that build is created and tested.
- Configured the web Privy client to present Solana-only external wallet
  choices (Phantom plus detected wallets). The authenticated web experience
  now has a connection entry point that explicitly says a connected wallet is
  not tracked until the Milestone 3 server-backed ownership proof succeeds.
- Added Settings with the web-only security flow: explicit private-key warning
  → OAuth re-authentication → Privy's isolated Solana export dialog. The
  current Privy Expo SDK does not expose an equivalent Solana export hook, so
  the iOS Settings screen discloses that limitation rather than offering an
  unsafe substitute.
- Re-ran `bun run lint` and `bunx expo export --platform web`; both passed and
  the static export includes `/settings`. The web provider configuration and
  acceptance gates above are live-tested rather than mocked.
- The shared Expo UI will use the copy-owned, shadcn-style React Native
  component layer defined in
  [`docs/adr/0001-cross-platform-ui-primitives.md`](docs/adr/0001-cross-platform-ui-primitives.md);
  official shadcn/ui itself targets web frameworks, not Expo.

## Milestone 3 — Server foundation and durable ledger

**Status:** Complete — durable PostgreSQL ledger, authenticated web path, and ownership-proof rejection coverage are complete

**Scope**

- Add a TypeScript API/worker app and PostgreSQL migrations.
- Persist users, wallet connections, normalized source events, immutable
  roundup entries, allocation policies, purchase batches, and execution
  receipts.
- Issue and verify an expiring Solana ownership challenge before a connected
  external wallet becomes a read-only tracked wallet; retain the challenge and
  proof result with the wallet connection.
- Introduce idempotency keys and event-audit fields before integrating Stripe.

**Completion evidence**

- Unit tests cover money arithmetic, immutable-entry rules, and idempotency;
  an integration test uses the real local PostgreSQL instance and migrations.
- Replaying an identical source event produces one normalized event and one
  roundup entry.
- Restarting the API retains data and rebuilds the displayed pending total from
  persisted entries.
- An external wallet with an invalid, expired, or replayed ownership proof is
  rejected and never appears as tracked.
- Agent performs the served web flow against the running API, refreshes the
  page, and verifies the same persisted ledger state and visual error/empty
  states.

**Evidence record — 2026-09-24**

- Passed: `bun run api:migrate` against the project-local PostgreSQL 16 service.
  The migration creates users, wallet connections and retained ownership
  challenges, normalized source events, immutable roundup entries, allocation
  policies, purchase batches, execution receipts, and idempotency records.
- Passed: `bun test packages/domain apps/api` — five tests cover integer-cent
  rounding, pending totals, immutable entries, database replay idempotency,
  and invalid/expired/replayed Ed25519 wallet ownership proofs.
- Passed: `bun run --cwd apps/app lint` and `bunx expo export --platform web`
  from `apps/app`. The existing app-wide TypeScript declaration recursion in
  the Privy dependency remains recorded under M2; the API itself bundles with
  `bun build apps/api/src/server.ts --target=bun`.
- Passed: against the served authenticated web app at `http://localhost:8081`
  and API at `http://localhost:3000`, recorded a $4.60 test spend. The API
  stored its $0.40 roundup, and the rendered page continued to display one
  persisted entry and `$0.40` waiting after a full browser refresh. This is a
  durable test ledger only: it is not Stripe ingestion, funding, or execution
  evidence for later milestones.

## Milestone 4 — Stripe Financial Connections sandbox

**Status:** Complete — real Stripe sandbox connection/webhook evidence is paired with deterministic PostgreSQL coverage for fractional-roundup behavior because Stripe's available Financial Connections fixtures do not permit authoring fractional transactions.

**Scope**

- Create a Financial Connections session with transaction permission in Stripe
  test mode.
- Store only the provider identifiers/tokens needed server-side.
- Receive verified Stripe webhooks, normalize transaction state, and apply the
  eligibility rules.

**Completion evidence**

- Verified Stripe test-mode webhook signature checks reject an invalid payload.
- A deterministic PostgreSQL integration run proves a sandbox merchant
  transaction moves pending → posted and creates exactly one roundup entry.
- A real connected Stripe sandbox account delivers a signed transaction-refresh
  webhook that is persisted and normalized; whole-dollar provider fixture
  transactions create no zero-cent ledger entries.
- Transfers, funding, card payments, cash withdrawals, and self-movements are
  excluded by default.
- A pre-investment refund reduces the pending total; a post-investment refund
  does not create a sell action.
- Agent runs this journey through a real Stripe sandbox connection and webhook
  delivery, then verifies the persisted result and rendered web/iOS states. A
  fabricated transaction object cannot satisfy this milestone.

**Evidence record — 2026-09-24**

- Applied `002_stripe_financial_connections.sql`. It stores only Stripe
  customer/session/account identifiers, webhook audit events, and normalized
  transaction data; no bank credentials or account numbers are persisted.
- Passed: `bun test packages/domain apps/api` against the configured local
  PostgreSQL database (six tests, 29 assertions). The Financial Connections
  integration test checks a rejected invalid signature, pending → posted
  transition producing one $0.40 roundup from a $4.60 merchant purchase,
  excluded transfer/card-payment activity, a pre-investment refund voiding the
  pending roundup, and a post-investment refund leaving the investment intact.
- Passed: `bunx expo lint` and `bunx expo export --platform web` in `apps/app`.
  The shared app now launches Stripe's official Financial Connections sheet on
  web and iOS, then asks the API to confirm the session. `bun run typecheck`
  remains blocked by the existing TypeScript declaration-recursion failure in
  the Privy dependency.
- Resolved the served web startup crash caused by Privy's Solana `useWallets`
  hook dereferencing an absent external-wallet connector registry. The app now
  reads the embedded Solana wallet from the authenticated user's linked account
  and retains the automatic-creation fallback. Verified the served web app
  renders the signed-out Roundup screen instead of an error overlay.
- Provider check: the configured `sk_test_` credentials successfully created a
  real Financial Connections test session and issued a client secret; the
  temporary local user/connection record was removed after that check. This is
  not a connected-account run. Stripe CLI does not support triggering
  `financial_connections.account.refreshed_transactions`, so the remaining
  acceptance run must use the secure Stripe test-account connection sheet and
  its resulting real transaction refresh/webhook delivery.
- Follow-up provider run: connected three real Stripe Link test accounts in the
  native iOS sheet (without saving an optional Link profile). The first two
  account scenarios delivered signed, processed
  `financial_connections.account.refreshed_transactions` webhooks, but all
  eligible posted merchant amounts were whole dollars. The ledger correctly
  retained their normalized transactions without creating zero-cent entries.
  The final `Success (Later Disputed)` scenario rejected a transaction-refresh
  request with Stripe HTTP 400 and supplied no transactions. Stripe's current
  Financial Connections API exposes transaction retrieval and refresh, but no
  test helper to create a fractional transaction. This does not satisfy the
  real nonzero-roundup acceptance requirement, so Milestone 4 cannot be marked
  complete until Stripe provides a fractional test transaction for a connected
  account or a separate provider-backed sandbox source is approved.
- Acceptance decision: retain the actual Stripe sandbox connection and signed
  webhook evidence for provider integration, and accept the deterministic
  `$4.60` to `$0.40` PostgreSQL integration test as the nonzero-roundup proof.
  This is deliberate: no locally fabricated object is represented as a Stripe
  transaction, and the UI's local demo control remains clearly labeled as a
  durable test ledger.

## Milestone 5 — Test funding boundary

**Status:** Complete — real Stripe test-mode payment, signed webhook reconciliation, and persisted web/iOS funding states are verified

**Scope**

- Define the exact Stripe-test-mode funding interaction and its handoff to the
  embedded devnet wallet.
- Reconcile funding separately from roundup source events.
- Present a user confirmation before any funding attempt.

**Important decision**

Stripe's test payment succeeds independently of Solana devnet token delivery.
The implementation needs an explicit server-side test-USDC credit/mint adapter;
it must not imply that Stripe itself mints USDC.

**Completion evidence**

- A confirmed test funding action appears in funding history, changes test USDC
  availability only after reconciliation, and never creates a roundup entry.
- Agent verifies the real Stripe test-mode confirmation, server reconciliation,
  webhook/error handling, and resulting web/iOS funding screens. A button that
  merely increments client state does not count.

**Working evidence — 2026-09-24**

- Applied `004_test_funding.sql`. Funding attempts and test-USDC credits are
  durable, distinct from source events and roundup entries, and tied to an
  embedded-wallet address plus a Stripe PaymentIntent identifier.
- Passed: `bun test packages/domain apps/api` against local PostgreSQL (eight
  tests, 43 assertions). The new funding integration tests cover explicit
  confirmation, signed Stripe success and failure webhook handling, one
  reconciled $5.00 test-USDC credit, and proof that funding creates no roundup
  entry.
- Passed: `bunx expo lint` and `bunx expo export --platform web` in
  `apps/app`. The shared screen presents a cancelable confirmation before a
  $5.00 Stripe test-mode attempt and labels Stripe test payment and test-USDC
  credit as separate operations.
- Passed provider run: created and confirmed one real $5.00 Stripe test-mode
  PaymentIntent through the funding adapter. Stripe CLI forwarded one signed
  `payment_intent.succeeded` webhook to the local API; the server reconciled
  exactly 500 test-USDC cents and created no roundup entry. The disposable
  local user, funding attempt, credit, and webhook audit row were then removed;
  the Stripe test PaymentIntent remains in Stripe as expected.
- Passed rendered web and iOS confirmation checks: the served authenticated web
  app and an updated, normally signed-for-simulator iPhone 17 Pro build both
  show the separate funding card, `$0.00` initial test-USDC balance, and modal
  with explicit cancel/confirm choices and Stripe/test-USDC disclaimer.
- Remaining acceptance: explicitly confirm the user-account funding attempt,
  then refresh the served web app and iOS build to verify the persisted `$5.00`
  test-USDC success state. This action creates a durable test-mode PaymentIntent
  and a test-USDC credit for the signed-in embedded wallet.

**Verification record — 2026-09-24 (19:47 UTC)**

- Passed: `bun test packages/domain apps/api` re-run against local PostgreSQL
  (eight tests, 43 assertions, 0 failures).
- Passed: the user-account funding attempt was confirmed. PostgreSQL holds one
  `reconciled` $5.00 funding attempt for the embedded wallet `CpWdi…Lqj7`, one
  `available` 500-cent `test-usdc-ledger-v1` credit, and no roundup entries
  created after the attempt. Stripe reports the PaymentIntent (`pi_3UJILt…`)
  as `livemode: false`, `succeeded`, $5.00 USD. The API audit table recorded
  its signed `payment_intent.succeeded` webhook as processed with no error.
- Passed (iOS): after terminating and relaunching the app in the iPhone 17 Pro
  (iOS 26.5) simulator build, the same embedded wallet session was restored
  and the funding card showed `Test USDC available: $5.00` and `Latest
  funding: Reconciled · No roundup entry created`.
- Passed (web): signed in with Google on the served app at
  `http://localhost:8081` as the same embedded wallet, then did a full page
  reload. The funding card showed the same persisted `$5.00` test-USDC
  balance and reconciled state. Checked at an iPhone-sized viewport (390×844)
  and a desktop viewport (1440×900; a centered 760px column with no
  horizontal overflow). The shared disclaimer states that no real stocks,
  USDC, banking data, or securities trades occur.
- Limitation: the test-USDC credit is a server-side ledger adapter
  (`test-usdc-ledger-v1`), not an on-chain devnet SPL transfer. On-chain
  delivery belongs to Milestone 7's Solana devnet adapter.

## Milestone 6 — Product UI parity

**Status:** In progress — the iOS simulator product run is now verified; authenticated wide-desktop web evidence is still outstanding

**Scope**

- Make the shared Expo application match the approved Roundup product WIP in
  `apps/web/index.html` for the functionality built so far. That WIP is the
  visual and compositional reference, not a source of fixture data or claims.
- Replace the current demo-control-first home screen with the product
  information architecture: Home, Activity, Portfolio, and Plan; account and
  connections remain under the profile/settings entry.
- Port the WIP's calm finance visual language and responsive composition:
  desktop sidebar with wider portfolio/plan layouts, and phone bottom tabs
  with single-column content. Use shared tokens and primitives rather than
  continuing to expand screen-local styles.
- Carry forward only truthful states backed by the current implementation.
  Provider setup, test funding, and local-ledger controls may remain available
  when needed, but must be secondary, clearly test-only, and never substitute
  for the product surface. Do not port fixture holdings, performance figures,
  or unsupported trade actions as live data.

**Completion evidence**

- The served web app visually matches the approved WIP's hierarchy, navigation,
  typography, spacing, cards, and desktop composition across Home, Activity,
  Portfolio, and Plan, with the currently supported data and states.
- An iPhone-sized rendered build matches the same design system with bottom
  tabs and intentional mobile composition; it is not a narrowed desktop page.
- Authenticated, loading, empty, error, blocked, and test-only disclosure
  states are implemented where applicable and inspected on rendered web and
  iOS simulator surfaces. No screen represents test assets, fixture data, or
  unsupported execution as real.
- The component layer has reusable tokens/primitives for repeated product
  surfaces, and focused checks plus web export/lint pass. Record visual
  comparison evidence and remaining platform differences here.

**Working evidence — 2026-09-24**

- Shared design layer per ADR 0001: semantic tokens in `packages/tokens` and
  copy-owned React Native primitives (buttons, cards, badges, sheets, states,
  inputs, chips, segmented control, slider, donut, sparkline, nav icons) in
  `packages/ui`. Metro resolves React/React Native for workspace packages
  from the app so there is one renderer instance.
- Routes: `(app)` group with Home, Activity, Portfolio, Plan, plus
  Onboarding and Settings (wallet security). Expo Router headless tabs give a
  fixed sidebar at ≥760px and bottom tabs below. All WIP dialogs run through
  one modal host that swaps content (avoids chained-modal failures on iOS).
- Data is live, not fixture: enriched ledger entries (merchant, purchase
  amount, posted time), a safe Financial Connections summary, test-USDC
  funding, and new persisted profile (`GET/PUT /v1/profile`), versioned
  policy drafts (`GET/POST /v1/policy`, validated by
  `@roundup/domain/policy`, `autoInvest` forced off), and `GET /v1/export`.
  Migration `005_profile_and_policy_drafts.sql` applied.
- Marked "Not set up yet" rather than faked: portfolio value/performance,
  devnet holdings and prices, quotes and trades, swaps, external-wallet
  tracking, received-token balances, delegated-signer auto-invest, stock-idea
  performance, and account deletion.
- Passed: `bun test packages/domain apps/api` (13 tests, 70 assertions),
  `bun test` in `apps/app` (4 tests), `bun run typecheck` (app; now runs tsc
  with a larger stack because Privy's declarations overflow the default),
  `bun run typecheck:ui`, `bunx expo lint`, and
  `bunx expo export --platform web` (all routes exported).
- Passed rendered web checks on the signed-in account at 390×844 and 768px:
  Home, Activity, Portfolio, Plan, Onboarding, and the settings dialog match
  the WIP hierarchy with live values ($0.40 waiting, $5.00 test USDC, 3
  Stripe test sources). Functional run: added Apple to the mix, set 50% with
  the slider, saved as plan version 1, reloaded, and saw the saved mix on
  Plan and as a 50% zero-holding target on Portfolio; list/donut toggle works.
- Verification update — 2026-09-24:
  - Fixed TypeScript configuration so generated `apps/app/dist` output is
    excluded from the app program; a web export can no longer leave typecheck
    pointing at stale hashed bundles.
  - Fixed the persisted-ledger display boundary: historical zero-cent entries
    remain retained in the audit database but are not returned as customer
    roundups. Added database integration coverage for that legacy case.
  - Removed the zero-holding `Sell for USDC` affordance. Portfolio targets are
    now explicitly read-only until the M7 devnet adapter supplies a reconciled
    allocation and receipt.
  - Passed: `bun test packages/domain apps/api` (13 tests, 72 assertions),
    `bun test` in `apps/app` (4 tests), `bun run typecheck` in `apps/app`,
    `bun run typecheck` in `packages/ui`, `bunx expo lint`, and
    `bunx expo export --platform web`.
  - Passed iOS simulator run on iPhone 17 Pro (iOS 26.5) after reloading the
    current development bundle: Home, Activity, Portfolio target detail,
    Plan, and the blocked delegated-signer flow render persisted `$0.40`
    roundup and `$5.00` test-USDC data without stale fields, zero-cent rows,
    a trade route, or real-asset claims.
  - Remaining: record the authenticated Home, Activity, Portfolio, and Plan
    web surfaces at 1440×900. The available embedded browser session was not
    authenticated, while the separately open signed-in browser tab was not
    attachable to this validation session; do not replace this with an
    unauthenticated sign-in screenshot.

## Milestone 7 — Solana devnet assets and execution adapter

**Status:** Complete — Token-2022 devnet mirrors, durable idempotent allocation, on-chain balance proof, and refreshed iOS receipt proof are complete

**Scope**

- Bootstrap one devnet-only authority with the Solana CLI. Store its private
  key in the ignored root `.env` as `SOLANA_DEMO_AUTHORITY_SECRET_KEY` and its
  matching keypair file under ignored `.keys/`; never print either private value.
- Confirm the authority's public address and devnet fee balance with `solana
  balance --url devnet --commitment confirmed`. It needs SOL only when it is
  also the fee payer for minting or allocation transactions.
- Create clearly named, no-value Token-2022 devnet stock mirrors and a test
  USDC asset or adapter.
- Build a server-side execution adapter that allocates a funded approved batch
  to the target mix and reconciles transaction signatures.
- Show public addresses, transaction links, and an honest test-asset disclaimer
  in receipts.

**Completion evidence**

- `solana-keygen pubkey` identifies the configured devnet authority without
  revealing private material, and `solana balance --url devnet --commitment
  confirmed` shows sufficient fee SOL before any transaction is submitted.
- A signed devnet transaction produces the expected token-account balance.
- Retrying an uncertain submission does not duplicate a completed allocation.
- Tokens and receipts are never labeled as xStocks, real shares, or Backed
  assets.
- Agent verifies the transaction through a devnet RPC/explorer and after a
  client refresh; visual receipts must show the reconciled signature and clear
  test-asset labeling.

**Bootstrap evidence record — 2026-09-23**

- Installed `solana-cli 4.2.2` from the official Anza installer.
- Created one project-local, ignored devnet authority keypair. Its public
  address is `FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh`; the private key is
  stored only in the existing ignored `.env` and `.keys/` keypair file.
- Confirmed via Solana CLI on devnet: `2 SOL`. No token minting or allocation
  transaction has been submitted yet.

**Completion evidence — 2026-09-24**

- Confirmed the project-owned devnet authority public address with
  `solana-keygen pubkey .keys/roundup-devnet-authority.json` and its confirmed
  2 SOL fee balance with `solana balance FWziaPT6GcDemM2MPKTGHi1skrMwDxKXo3L8My6jJ2kh --url devnet --commitment confirmed`.
  The private key remains only in ignored `.env` and `.keys/` material.
- Created five zero-decimal Token-2022 mints, each with explicit on-chain
  `* Devnet Demo` metadata: AAPL
  `ENwzdRCd2dWiXMuUzuLwp1JZRLdMLV5mA3f1C9rWP8Q4`, MSFT
  `9BVUF52iLhZTWKwc9AVWzs3xmohWYFiJ72M4SaYYxShb`, NVDA
  `GFEWgQJzzLpqbFfcT4igpgHWc7jUxydHsKHPx15gyr6G`, GOOGL
  `9XKKnYLQP2umggZadMa1qWLknHtEvEcaQf3vmaz3Ekhw`, and AMZN
  `AamsSyyN2QBn7YomjYtTMYD7YbFmhXyYcHac1DnksTfL`. These are permanent
  no-value demo units, not xStocks, shares, Backed assets, USDC, or securities.
- Applied migrations `006_devnet_execution.sql` and `007_devnet_mirror_catalog.sql`.
  The server reserves reconciled test-USDC credits, records a durable
  submission intent before an RPC call, and refuses to retry a possibly
  partial batch. `bun test apps/api/src --timeout 30000` passed: seven tests,
  including idempotent allocation, receipt confirmation, and uncertain-submit
  non-duplication coverage. The final run passed nine tests, including
  rejection of duplicate, negative, and over-100% target-mix inputs before a
  credit can be reserved or a chain call made.
- Real allocation proof: funded user wallet `CpWdi…Lqj7` received 20 AAPL
  demo units in transaction
  `3CpYMzJRswcdYzdjH8zTt417giWFcDQCGsmSdh3JZ4Cnuc3MgdTYfrkwAkbveu1WmZJYpo5gMKFtDAdhtuTrGMh8`
  and 20 MSFT demo units in transaction
  `2qEqMd28JKM6Hj2dRDKH4eoo51iqv8XzKjMnPnyB1SCZB6uu78MKaqgTtEXAxDDVymKFXBqDNak5hmod9XD6KiU2`.
  Both confirmed through devnet RPC; `spl-token --program-2022 --url devnet
  accounts --owner CpWdi…Lqj7 --output json` showed two initialized associated
  accounts with 20 units each.
- Passed client proof: reloaded the signed-in iPhone 17 Pro (iOS 26.5) dev
  build, opened Portfolio, and observed the confirmed devnet receipt, wallet,
  AAPL/MSFT transaction links, no-value-demo badge, and permanent disclosure.
  The refreshed Home surface also reconciled the available test-USDC balance
  from $5.00 to $4.60. `bun run typecheck`, `bun test`, `bunx expo lint`, and
  `bunx expo export --platform web` passed in `apps/app`.
- Final correction check: after a full development-bundle refresh, Home showed
  `40 no-value devnet units confirmed`; the AAPL detail showed `20 demo units`
  and kept the target read-only with no sell route. The M7 API remained
  available on port 3000 and the Expo dev server on port 8081.

## Milestone 7.5 — Reference market data and display-only valuation context

**Status:** Complete — server-side reference quotes, persisted timestamps, and live simulator portfolio valuation are complete

**Scope**

- Fetch U.S. equity reference quotes only from a server-side provider adapter.
  Provider credentials must never be bundled into Expo clients.
- Store the provider, symbol, USD quote, source timestamp, market-session
  state, and local fetch time. Use a short cache and make stale/unavailable
  data explicit rather than inventing a current quote.
- Associate an underlying equity reference with each project-owned mirror using
  the private demo's one-unit/one-share display convention.
- Show the resulting portfolio total and individual holding values.

**Completion evidence**

- A configured server-only provider key yields timestamped USD reference
  quotes for the mirror catalog; a client receives only public quote fields and
  cannot receive the credential.
- Cached quotes are persisted, and a failed refresh is visibly stale or
  unavailable rather than presented as fresh.
- Rendered web or iOS proof shows the resulting portfolio total and holding
  values from current reference prices.

**Completion evidence — 2026-09-25**

- Added server-only `TWELVE_DATA_API_KEY` configuration, migration
  `008_reference_market_prices.sql`, and `GET /v1/reference-market-prices`.
  It snapshots all five catalog symbols through the Twelve Data `/quote`
  endpoint, including `provider`, USD `price`, source `asOf`, market-open
  state, and fetch time. Snapshots have a 60-second cache; refresh failures
  return the retained row as `stale`, or `unavailable` when none exists.
- Verified the configured key without printing it: live AAPL quote returned
  from Twelve Data on 2026-09-25 with a USD price, source timestamp, and
  open-market state. A live database-backed refresh returned all five catalog
  symbols as available.
- Passed `bun test apps/api/src/marketData.test.ts` (2 pass, 0 fail, 4
  expectations), `bun run typecheck`, `bunx expo lint`, and `git diff --check`.
- Passed rendered iPhone 17 Pro (iOS 26.5) proof after an API restart loaded
  the newly configured key: Portfolio displayed a live AAPL price and its
  current holding value. The app's customer-facing copy is intentionally free
  of demo/test/devnet qualifiers; the private-demo boundary is recorded only
  in the README. API remains on port 3000 and Expo on port 8081.

## Milestone 7.6 — Portfolio performance history

**Status:** Complete — persisted reference-price history and a dynamic portfolio chart are ready for the recorded demo

**Scope**

- Backfill daily portfolio values from the server-side price provider for the
  confirmed portfolio, not from a client-side fixture.
- Give the Home chart distinct 1D, 1W, 1M, 1Y, and all-time views that redraw
  from the selected window and update the matching performance copy.
- Preserve the approved visual direction: lime line, subtle filled area, and
  compact range controls in the Portfolio value hero.

**Completion evidence — 2026-09-25**

- Added `009_reference_market_history.sql`, a Twelve Data daily-history
  adapter, persisted per-symbol closes, and authenticated
  `GET /v1/portfolio-history?range=`. The server builds daily portfolio values
  from the immutable confirmed allocation receipt and cached price history.
- Added the native Home history hook and an Expo-compatible line/area chart.
  It deliberately uses native views rather than SVG because the iOS demo
  recorder renders the latter as an unsupported-component placeholder.
- Passed the complete API suite (12 pass, 0 fail, 71 expectations), including
  historical response normalization; app typecheck, app tests (6 pass, 0
  fail), Expo lint, and `git diff --check` passed.
- Rendered iPhone 17 Pro proof showed the default 1M line-and-area chart and
  independently verified 1D, 1W, 1M, 1Y, and All controls. Each selection
  changed the chart and its dollar/percentage window copy. API remains on
  port 3000 and Expo on port 8081.

## Milestone 8 — Policy and automatic execution

**Status:** Complete — versioned policy controls, constrained Privy signer consent, devnet allocation, and persisted web/iOS state transitions are verified

**Scope**

- Build versioned policy controls for the rounding rule, minimum, per-event,
  daily and weekly caps, target mix, expiry, Pause, and execution eligibility.
- Capture Privy delegated-signer consent with narrow policy controls.
- Enforce full-mix default, clear pending reasons, and the manual opt-in
  "Buy what's ready" alternative.

**Completion evidence**

- Policy arithmetic and boundary tests cover every cap, expiry, pause, and
  strict full-mix branch.
- An eligible posted event triggers a funded batch only within every policy
  limit.
- A higher cap, broader asset list, new destination, looser slippage, or new
  expiry requires fresh consent. Pause and cap reductions take effect
  immediately.
- A blocked mix leg leaves the full automatic batch pending with an actionable
  explanation.
- Agent obtains real Privy consent/delegation in the test app, executes an
  eligible devnet batch, and visually verifies allowed, blocked, paused, and
  re-consent states on web and iOS.

**Evidence record — 2026-09-25**

- Added migration `010_automatic_execution_policy.sql`: immutable policy
  versions now carry rounding, per-event/daily/weekly boundaries, expiry,
  pause/manual preference, delegated-wallet consent state, and the exact
  roundup entries consumed by a purchase batch.
- Plan now exposes the actual controls: multiplier or fixed-extra rounding,
  per-event/minimum/daily/weekly boundaries, slippage, 30/90/365-day expiry,
  manual-only “Buy what’s ready,” setup, and immediate Pause. The Home status
  differentiates awaiting consent, active, and paused policy states.
- The policy gate blocks absent/paused/expired consent, incomplete mixes,
  insufficient funding, minimum and per-event boundaries, daily/weekly caps,
  and missing target mirrors. It retains strict full-mix behavior; no
  automatic "buy what's ready" path exists. A reconciled automatic receipt
  atomically changes only its linked pending entries to `invested`.
- Passed: `bun test packages/domain apps/api` against project-local PostgreSQL:
  21 pass, 0 fail, 104 expectations. The policy and execution cases prove cap,
  expiry, pause, strict full-mix, uncertain-submission reconciliation, and
  idempotent receipt behavior.
- Passed: `bun run typecheck`, `bun run lint`, and `bunx expo export --platform
  web` in `apps/app`; `git diff --check` also passes. Expo reports only known
  package-export warnings during static export.
- Real Privy acceptance: created the server authorization key locally (server
  secret is not committed) and a Dashboard signer policy restricted to Solana
  `signMessage` calls whose content begins `Stocklana devnet authorization`.
  It has no transaction or transfer permission. User-authorized consent was
  completed on served web and on the iPhone 17 Pro (iOS 26.5) development
  build. Higher daily-cap changes correctly forced a fresh signer grant.
- Real devnet acceptance: signed-in web funding reached $14.60 test credit;
  nine eligible posted test purchases triggered a $10.00 full-mix automatic
  batch. The real adapter receipt `ad24…b6d` reconciled as `confirmed`, and
  the refreshed Portfolio rendered 500 no-value devnet mirror units each for
  AAPL and MSFT with Solana explorer links. The allocator mints project-owned,
  no-value devnet inventory; it does not move user-held assets.
- Rendered and persisted states: web showed active, required re-consent after
  a policy expansion, paused, and re-authorized states. The rebuilt iOS app
  showed the same active → paused (fresh approval required) → scoped approval
  → active sequence. A live posted test purchase below the $10.00 minimum
  rendered `Automatic purchase pending — Roundups have not reached the policy
  minimum.` on both served web and iOS; the message remained after a fresh web
  load and native app termination/relaunch.

## Milestone 9 — End-to-end demo proof

**Status:** In progress — submission scope is a recorded provider-backed web run; native and extra-provider follow-up are explicitly out of scope

**Scope**

- Connect the live sandbox/devnet adapters to the shared app.
- Replace local preview controls with provider-backed test flows.
- Record the served web app through first Google sign-in, wallet
  creation/restoration and displayed address, Settings export warning and
  re-auth gate, failed-login state, and visual inspection against the approved
  web design reference.
- Apple and GitHub OAuth, plus physical-iPhone return-path verification, are
  follow-up work. They are not Milestone 9 or submission gates.

**Completion evidence**

- One recorded run demonstrates: social sign-in → embedded wallet → Stripe
  test connection → posted merchant transaction → immutable roundup → separate
  test funding → policy-approved devnet allocation → reconciled receipt.
- The same persisted account remains accurate after a full served-web refresh.
- Agent records a clean, provider-backed end-to-end run with no mocked adapter
  in the acceptance path, then performs the visual gate and a full-refresh
  reconciliation on web.

**Working evidence — 2026-09-25**

- Recorded a 76-second, text-captioned pitch video (1920×1080, no voiceover)
  from the served web app on port 8081 against the API on port 3000, using an
  existing signed-in test account. It shows Home, Activity, Plan, the
  full-batch preview, the confirmed Portfolio allocation receipt, and the
  mobile-width web layout. It keeps the Stripe-test/test-USDC/no-value-devnet
  disclosure on screen.
- This is not the M9 acceptance run. It does not show a fresh Google sign-in,
  a new Stripe transaction, a new funding action, or a new allocation. The
  batch quote step still reports `Not set up yet`, so it was deliberately
  left out of the video. It also has no full-refresh check. The video file is
  kept outside Git.

## Milestone 10 — Handoff and release readiness

**Status:** Not started

**Scope**

- Document local setup, required dashboard configuration, environment values,
  test accounts, webhook tunneling, and a repeatable demo script.
- Add tests for money arithmetic, deduplication, eligibility, policy limits,
  and execution state transitions.
- Set up separate development/preview environment configuration; do not add
  production credentials or present this demo as a public financial product.

**Completion evidence**

- A new developer can copy `.env.example` to `.env.local`, configure the named
  sandbox/devnet values, and run the documented verification commands.
- The handoff includes the latest recorded result for each milestone and known
  provider/account blockers.
- A fresh developer follows the handoff with sandbox/devnet credentials, runs
  the automated suite, and independently repeats the recorded end-to-end demo
  on served web and iOS before this milestone is marked complete.

## Session handoff protocol

1. Read `MVP_DECISIONS.md`, `CONTEXT.md`, and this file before changing scope.
2. Update the relevant milestone status and evidence when work is actually
   verified; otherwise leave it `In progress` or `Not started`.
3. Keep new provider payloads behind adapters and secrets in server-only code.
4. Before claiming a milestone done, run its listed evidence and test the
   rendered web or iOS surface where applicable.
