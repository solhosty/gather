# Stock roundup app — first product plan

Planning draft · September 21, 2026. No application has been implemented. Product name, launch country, providers, and release approvals are not settled.

## Product promise and launch scope

Turn eligible everyday spending into small investments in a portfolio the user chooses.

Both read-only linked bank accounts and Solana wallet activity are launch requirements. They feed the same roundup ledger and purchase-review experience. Bank access must be proven against real institutions in the selected market; sandbox access is demonstration evidence only.

Recommend an iOS TestFlight beta plus a fully usable responsive browser app, with the same visual language and core screens. The user explicitly wants shared UI and a monorepo. A public App Store release is a separate milestone, not a promise for the hackathon. External TestFlight also requires review.

The user's tentative first market is the US. **The currently published xStocks offering excludes US persons and US access.** The official partner page also lists UK/Canada/Australia restrictions and places geographic compliance obligations on integrators. The SEC's September 2026 temporary innovation exemption creates a potential US path for qualifying tokenized-securities venues; it does not make the current xStocks offering US-eligible or identify a live Solana retail provider. My initial UK/Europe question grouped markets too broadly; UK is not an established fallback. No country is presumed eligible solely because it is non-US. [xStocks partner requirements](https://xstocks.com/partner) · [SEC exemption announcement](https://www.sec.gov/newsroom/press-releases/2026-90-sec-issues-innovation-exemption-facilitate-trading-tokenized-nms-stock-request-comment)

Continue provider-neutral product design and bank/wallet feasibility work. Before live trading, resolve either a documented US-permitted stock execution arrangement or a specifically verified eligible non-US market. A US bank trial plus simulated stock buys can prove part of the experience, but is not the requested live end-to-end launch. Using another token issuer or moving the UI to the web does not automatically resolve eligibility.

## Feasibility findings and decisions still required

- **Bank data:** Plaid Transactions supports read-only transaction ingestion. Its US/Canada Trial provides up to 10 production Items, subject to application and availability. European access has different commercial/onboarding requirements. Confirm target institutions, approval, latency, and actual cost before selecting Plaid over a regional alternative. [Pricing](https://plaid.com/docs/account/billing/) · [European plans](https://support.plaid.com/hc/en-us/articles/16110502116887-What-are-Plaid-s-prices-and-pricing-plans-and-how-do-they-differ)
- **iOS:** propose React Native + Expo development builds. Plaid has a React Native SDK. For an existing Phantom wallet, verify universal-link connection, signing, cancellation, and return-to-app on a physical iPhone. Do not assume desktop injected-wallet behavior works natively. [Plaid SDK](https://plaid.com/docs/link/react-native/) · [Phantom integration](https://docs.phantom.com/solana/integrating-phantom)
- **Distribution:** confirm Apple Developer organization/account readiness. Apple applies specific financial-services and crypto-securities requirements; a noncustodial design is not proof of acceptance. [Review guidelines 3.1.5 and 3.2.1(viii)](https://developer.apple.com/app-store/review/guidelines/) · [TestFlight review](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- **Stock eligibility:** choose issuer and launch jurisdiction together. xStocks excludes US persons and the US; the UK, Canada, and Australia are also currently restricted on the official partner page. An onramp's approval does not authorize stock distribution. Confirm whether an app partner arrangement is required in the selected market. [Issuer partner requirements](https://xstocks.com/partner)
- **Funding:** launch purchases use funded USDC. A bank connection provides data, not debit authority. Card/onramp funding is a separate user-approved operation. Stripe's basic hosted redirect is lightweight, while customized sessions require access; geography and supported currency/network must be checked. [Stripe](https://docs.stripe.com/crypto/onramp/stripe-hosted)
- **Execution:** evaluate Jupiter routes for a small allowlist of eligible stock tokens at actual small order sizes. Establish minimum practical batch size from quotes, fees, account creation costs, and price impact. [Jupiter](https://developers.jup.ag/docs/swap)
- **Portfolio:** read current wallet holdings independent of the app used to purchase them. Helius can return SPL/Token-2022 balances; its documented balance prices are estimates updated hourly, so use a separate fresh valuation/execution source. [Helius](https://www.helius.dev/docs/wallet-api/balances)

## Money model

Keep these three concepts separate everywhere:

1. **Roundups calculated:** an investment suggestion derived from spending. This is not cash held by the app.
2. **Available to invest:** actual spendable USDC in the selected funding wallet, with fees accounted for.
3. **Invested:** confirmed stock purchases and current holdings.

Initial rule: round each eligible purchase to the next whole unit in its source currency; exact whole amounts add zero. User sets a weekly cap and can pause each source. Start with one currency per launch market; show FX explicitly when converting a non-USD proposal into USDC. Never mix currencies as if they were dollars.

Each eligible event creates a separate roundup entry. The entries accumulate in the roundup ledger; they do not require a buy per coffee purchase. A purchase becomes eligible only once the available USDC and configurable minimum trade threshold are both met. The default threshold must be based on measured small-order costs.

Bank purchases qualify after posting. Pending entries can be shown as estimates, excluded from the ready total. Reconcile pending-to-posted IDs, amended amounts, removals, and refunds. Refunds before execution reduce the proposal; after execution they do not silently sell stocks. Ignore historical transactions before activation unless the user explicitly includes them.

Onchain v1: count supported, identifiable outgoing USDC payments. Exclude own-wallet transfers, swaps, investment purchases made by this app, exchange top-ups, lending movements, fees, and failed transactions. An arbitrary outgoing transfer is not proof of consumer spending; uncertain events need classification or exclusion. Add SOL/non-stablecoin spending only after reliable historical valuation is implemented.

Avoid counting both a bank-funded wallet top-up and the later wallet purchase. Bank card repayments, transfers, and crypto funding are not eligible purchases. Each source event can contribute only once, including after webhook retries.

## Navigation and design direction

Four bottom tabs: **Home · Activity · Portfolio · Plan**. Connections and account settings live under the profile entry, with direct links from source rows.

Calm finance design: warm neutral background, dark legible text, one restrained accent, generous spacing, tabular monetary values, familiar company marks, accessible text scaling. Prioritize the balance and next action; avoid trading-terminal clutter, decorative market tickers, and gamification that encourages spending more.

Phone: bottom tabs, single-column content, full-height purchase review. Desktop browser: sidebar navigation, wider portfolio layout, and a side-by-side allocation editor and order summary. Same labels, components, calculations, and states; adapt composition rather than stretching a phone screen. Browser support includes keyboard navigation, visible focus, deep links, refresh recovery, and wallet reconnect. Both clients must preserve an unfinished review across app-switching or navigation.

### Home

- Portfolio value and a small clearly labeled value chart.
- One primary action: “Review $24.00” or “Add funds to invest $24.00.”
- Separate calculated roundups and available USDC.
- Weekly cap progress and a short list of contributing purchases.
- Action-required notices for reconnecting a bank, a failed purchase leg, or an expiring authorization. No generic notification pile.

### Activity

- Bank and wallet purchases in one feed, with source filter and connection freshness.
- Each row explains the purchase amount, its roundup, and why it is pending, ready, excluded, or invested.
- Separate purchase-batch records from the spending events that generated them.
- Detail view permits excluding an uninvested event and inspecting the rule used.

### Portfolio

- Default view: supported stock holdings in the connected wallet(s), including purchases from other apps.
- Filters for Stocks / All supported assets and wallet; show available USDC separately.
- Holding detail: issuer/token identity, amount, value, price timestamp, allocation, and available versus protocol-deposited status where supported.
- Aggregate each owned token account once. Two apps displaying the same wallet are not two positions. Different issuer tokens can be grouped by company but remain separate underneath.
- Show value history separately from investment performance. External deposits are not profit. Imported holdings with unknown cost basis show “Cost basis unavailable,” not invented gains.
- Wallet-held tokens are v1. Lending/LP/vault holdings require explicit adapters and must be visibly marked as unsupported until implemented; do not promise every protocol position.

### Plan

- Selected stocks and target percentages, totaling 100%.
- Roundup rule, eligible sources, daily/weekly cap, minimum trade threshold, pause control.
- Funding wallet and approval mode.
- Read-only linked accounts, reconnect/remove actions, and explicit disconnect/delete-data controls.
- Changes to the buying mix affect future purchases. They do not silently rebalance or sell existing positions.

## Purchase review: the main interaction

Use “investment mix” or “allocation,” not “stock split” (which also names a corporate action).

1. **Amount:** show the accumulated proposal, selected funding wallet, spendable balance, and contributing purchases. Allow the user to lower the amount or explicitly add more.
2. **Allocation:** editable percentage fields with +/- controls and a live dollar preview; show total and remainder. Submission requires 100%. Ticker search is limited to supported, eligible assets.
3. **Scope of edit:** default changes apply to this purchase only. A separate “Save as my future mix” control updates the plan; make that choice visible.
4. **Review quote:** show gross wallet debit, fees, net investment, estimated units per stock, price impact, and minimum received. Refresh expired quotes and request confirmation when material terms change.
5. **Authorize:** an explicit purchase button followed by wallet signing. Biometric app unlock is not represented as onchain authorization unless the selected wallet actually uses it that way.
6. **Progress and receipt:** show confirmed purchases, remaining USDC, and any unfinished legs. Update positions only from confirmed execution.

Illustrative allocation only, not a recommended portfolio: $24 net investment at 60% / 25% / 15% previews $14.40 / $6.00 / $3.60. Fees are shown outside this net amount. Use fixed-point arithmetic; assign rounding remainder deterministically and display the final total.

Treat a multi-stock purchase as a batch. Do not promise a single blockchain transaction or signature before testing composition limits and wallet support. If separate swaps are necessary, display the steps upfront. After a partial fill, retry only unfinished legs; never repeat completed buys. No silent substitutions or percentage redistribution if a stock cannot be bought.

## Approval and automation states

Purchase lifecycle: calculating -> ready for review -> needs funding (if needed) -> quoted -> awaiting signature -> submitted -> confirmed / partially completed / failed.

Track each trade separately. A rejected wallet signature preserves the proposal. On an uncertain submission, check chain status before allowing another attempt.

Launch recommendation: review-first for both sources, with an optional event-driven auto-invest policy as the clearest later milestone. The policy is not “buy every week.” After each eligible **posted bank event** or confirmed **onchain payment**, its roundup is added to the ledger. When the minimum trade threshold is reached and funded USDC is available, the system buys the currently most-underweight approved asset(s) to move the wallet toward the user's target percentages.

Auto-invest needs a one-time, explicit, capped, revocable policy covering: allowed source events; the roundup rule; asset mints and target weights; user-owned destination wallet; per-event, daily, and weekly caps; minimum trade threshold; quote age/slippage limits; expiry; and a kill switch. It must produce a human-readable execution receipt for every trade. A change that adds an asset, raises a cap, loosens slippage, changes destination, or extends expiry needs a new signature; a reduction or pause takes effect immediately. Plain SPL delegation limits amount but does not enforce this policy, so the exact execution mechanism needs a constrained program/session-key design and audit before it can be called safe. [Solana delegation](https://solana.com/docs/payments/advanced-payments/spend-permissions)

## Proposed implementation structure

- Monorepo: pnpm workspaces; add Turborepo for coordinated dev/build/check tasks if useful. Proposed structure (planning only; nothing scaffolded):
  - `apps/client`: Expo Router application targeting iOS and browser through React Native Web, sharing core screens with responsive layouts.
  - `apps/api`: backend endpoints, webhooks, and worker entrypoints.
  - `packages/ui`: design tokens, typography, money displays, allocation editor, holding rows, buttons, and form components.
  - `packages/domain`: money arithmetic, roundup rules, allocation validation, purchase states, and event deduplication rules.
  - `packages/contracts`: validated request/response schemas shared by client and backend.
  - `packages/providers`: server-only bank/indexer/quote integrations; keep secrets and provider tokens out of client bundles.
  - Native/web adapters inside the client for bank linking, wallet connection/signing, secure storage, and notifications.
- Use Expo development builds for native modules; do not rely on Expo Go. A browser build must actually run the bank and wallet flows using their web SDKs, not simply render the native screen. Confirm packages resolve consistently and prevent duplicate React versions. [Expo monorepo guide](https://docs.expo.dev/guides/monorepos/)
- Backend: TypeScript service, PostgreSQL, background workers for provider sync, webhook reconciliation, quotes, execution reconciliation, and portfolio snapshots.
- Adapters: bank transactions; Solana history/balances; quote/execution provider; identity/wallet session; optional onramp. Keep vendor payloads behind adapter boundaries.
- Core records: user, connection, wallet, normalized source event, roundup entry, versioned allocation plan, purchase batch, trade leg, quote/approval record, holding snapshot.
- Provider secrets and bank access tokens stay server-side, encrypted; enforce per-user access. Connect-wallet proof is separate from investment permissions. No arbitrary destination or transaction payload from a client is trusted.

## First work packages and acceptance criteria

1. **Feasibility spike:** settle market; prove real bank connection and posted-event sync, iPhone wallet signing, fresh token balances, and practical quotes for a 2–3 asset basket. Verify provider permissions and developer account readiness. Output a supported matrix with measured costs, not assumptions. If bank production access is unavailable, report that the required live scope is blocked rather than presenting sandbox as shipped.
2. **Interaction prototype:** Home -> activity explanation -> edit allocation -> approve -> partial-failure/receipt -> portfolio. Include insufficient funds, stale connection, invalid allocation, rejected signature, and unknown cost basis. Verify on phone-sized screens and with large text.
3. **End-to-end implementation:** both source adapters feed the same idempotent ledger; one approved funded batch executes; independent wallet holdings appear without double counting. No live customer trades during development without explicit authorization.
4. **Beta delivery:** real-device walkthrough, duplicate/refund/retry tests, privacy and deletion flow, crash/error handling, TestFlight submission and mobile-web judging access. Label every simulated source/trade honestly.

Target hackathon deadline: September 25, 2026, 4pm ET per the [event page](https://hackathons.solana.com/hackathons/stocklana). Native distribution, bank production access, and live trading are separate release gates. If approvals take longer, retain both integrations in scope and report the precise unfinished gate.

## Open decisions

- First live user country and supported institutions — tentative US preference, incompatible with a live xStocks offering under published terms. Resolve execution eligibility before selecting production asset/provider.
- iOS distribution — recommend TestFlight beta plus mobile web; user asked for a recommendation.
- Existing external wallet versus optional embedded wallet — propose external wallet first; validate real-device friction before committing.
- Shared browser/iOS experience and monorepo — requested and included above.
- Product name, fees/business model, and exact asset list — not decided.

Success test: a user can explain where a roundup came from, change the investment mix without confusion, approve with clear costs, and find the resulting holdings alongside their existing positions.
