# Roundup context

## Ubiquitous language

- **Spend source**: A read-only bank account or wallet whose eligible outbound activity can create a roundup entry. It never authorizes Roundup to move money from that account. Stripe Financial Connections is the demo bank spend source.
- **Funding source**: A user-initiated path that places test USDC in the embedded wallet. It does not itself create a roundup entry. Stripe test-mode payment/onramp flows are the demo funding source.
- **Roundup entry**: An immutable record of the amount derived from one eligible, posted spend event, after duplicate and exclusion checks.
- **Allocation policy**: The user-controlled threshold, caps, asset mix, and auto-invest settings that determine when eligible roundup entries may become a purchase batch.
- **Devnet stock mirror**: A clearly labeled, no-value Solana devnet token used only to demonstrate stock-like allocation and execution. It is not an xStock, security, or asset issued by Backed.
- **Execution adapter**: The component that turns an approved purchase batch into token allocation. The initial adapter uses devnet stock mirrors; it is intentionally replaceable if a supported real execution provider is approved later.

## Demo boundary

The demo can use real provider sandbox events, real embedded-wallet flows, and real Solana devnet transactions. It must state that all bank activity, USDC, and stock-mirror tokens are test assets and that no real securities trade occurs.
