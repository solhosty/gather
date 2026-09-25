import { findMirror, type MixLeg } from '@roundup/domain/policy';
import type { Database } from './db';

export type DevnetLegReceipt = { symbol: string; mintAddress: string; units: number; signature: string; explorerUrl: string };
export type DevnetExecutionAdapter = {
  allocate(input: { walletAddress: string; legs: Array<{ symbol: string; mintAddress: string; units: number }>; idempotencyKey: string }): Promise<DevnetLegReceipt[]>;
  confirm(signature: string): Promise<boolean>;
};

const authorityPath = new URL('../../../.keys/roundup-devnet-authority.json', import.meta.url).pathname;
const rpcUrl = process.env.EXPO_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

async function command(args: string[]) {
  const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  if (exitCode !== 0) throw new Error(stderr.trim() || stdout.trim() || `Solana command failed (${exitCode}).`);
  return stdout;
}

function signatureFrom(output: string) {
  try {
    const parsed = JSON.parse(output) as { commandOutput?: { transactionData?: { signature?: string } }; signature?: string };
    const signature = parsed.signature ?? parsed.commandOutput?.transactionData?.signature;
    if (signature) return signature;
  } catch { /* fall through to CLI text */ }
  const match = output.match(/[1-9A-HJ-NP-Za-km-z]{64,88}/);
  if (!match) throw new Error('Solana CLI did not return a transaction signature.');
  return match[0];
}

export function createCliDevnetAdapter(): DevnetExecutionAdapter {
  return {
    async allocate({ walletAddress, legs }) {
      const receipts: DevnetLegReceipt[] = [];
      for (const leg of legs) {
        // The fee payer/mint authority is project-owned and never an end-user wallet.
        const common = ['--program-2022', '--url', rpcUrl, '--fee-payer', authorityPath, '--output', 'json'];
        const addressOutput = await command(['spl-token', '--program-2022', '--url', rpcUrl, 'address', '--verbose', '--token', leg.mintAddress, '--owner', walletAddress]);
        const account = addressOutput.match(/Associated token address:\s*([1-9A-HJ-NP-Za-km-z]{32,44})/)?.[1];
        if (!account) throw new Error('Solana CLI did not return the recipient token account address.');
        try {
          await command(['spl-token', ...common, 'create-account', leg.mintAddress, '--owner', walletAddress]);
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('Account already exists')) throw error;
        }
        const mintOutput = await command(['spl-token', ...common, 'mint', leg.mintAddress, String(leg.units), account, '--mint-authority', authorityPath]);
        const signature = signatureFrom(mintOutput);
        receipts.push({ symbol: leg.symbol, mintAddress: leg.mintAddress, units: leg.units, signature, explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet` });
      }
      return receipts;
    },
    async confirm(signature) {
      const output = await command(['solana', 'confirm', '--url', rpcUrl, signature]);
      return /Finalized|Confirmed|processed/i.test(output);
    },
  };
}

type MirrorRow = { symbol: string; mint_address: string; name: string; token_symbol: string };
type BatchRow = { id: string; state: string; amount_cents: number; wallet_address: string; allocation_mix: MixLeg[] };

function allocationUnits(amountCents: number, mix: MixLeg[]) {
  const nonzero = mix.filter((leg) => leg.percent > 0);
  if (!nonzero.length) throw new Response(JSON.stringify({ error: 'Choose at least one devnet mirror target.' }), { status: 400 });
  const allocations = nonzero.map((leg) => ({ ...leg, units: Math.floor((amountCents * leg.percent) / 100) }));
  let remaining = amountCents - allocations.reduce((sum, leg) => sum + leg.units, 0);
  for (const allocation of allocations) { if (remaining <= 0) break; allocation.units += 1; remaining -= 1; }
  return allocations.filter((leg) => leg.units > 0);
}

function receiptFor(batch: BatchRow, legs: DevnetLegReceipt[], state: string) {
  return {
    environment: 'Solana devnet only. These are no-value demo units, not xStocks, real shares, Backed assets, USDC, or securities.',
    state,
    batchId: batch.id,
    walletAddress: batch.wallet_address,
    amountCents: batch.amount_cents,
    legs,
  };
}

export async function readExecutions(sql: Database, userId: string) {
  const rows = await sql<{ id: string; state: string; receipt: unknown; created_at: string }[]>`
    SELECT receipt.id, receipt.state, receipt.receipt, receipt.created_at
    FROM execution_receipts AS receipt JOIN purchase_batches AS batch ON batch.id = receipt.purchase_batch_id
    WHERE batch.user_id = ${userId} ORDER BY receipt.created_at DESC
  `;
  return { receipts: rows.map((row) => ({ id: row.id, state: row.state, receipt: row.receipt, createdAt: row.created_at })) };
}

export async function createExecution(sql: Database, userId: string, input: unknown, idempotencyKey: string, adapter: DevnetExecutionAdapter) {
  const body = input as Record<string, unknown>;
  const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';
  const amountCents = body.amountCents;
  const mix = body.mix;
  if (!walletAddress) throw new Response(JSON.stringify({ error: 'walletAddress is required.' }), { status: 400 });
  if (!Number.isSafeInteger(amountCents) || (amountCents as number) <= 0) throw new Response(JSON.stringify({ error: 'amountCents must be a positive whole number.' }), { status: 400 });
  if (!Array.isArray(mix) || mix.some((leg) => !leg || typeof leg !== 'object' || typeof (leg as MixLeg).symbol !== 'string' || !Number.isSafeInteger((leg as MixLeg).percent) || (leg as MixLeg).percent < 0 || (leg as MixLeg).percent > 100 || !findMirror((leg as MixLeg).symbol))) throw new Response(JSON.stringify({ error: 'mix must contain supported devnet mirror targets with whole percentages from 0 to 100.' }), { status: 400 });
  const typedMix = mix as MixLeg[];
  if (new Set(typedMix.map((leg) => leg.symbol)).size !== typedMix.length) throw new Response(JSON.stringify({ error: 'Each devnet mirror may appear only once in a mix.' }), { status: 400 });
  if (typedMix.reduce((total, leg) => total + leg.percent, 0) !== 100) throw new Response(JSON.stringify({ error: 'mix must total exactly 100%.' }), { status: 400 });

  const batch = await sql.begin(async (tx) => {
    const [existing] = await tx<BatchRow[]>`SELECT id, state, amount_cents, wallet_address, allocation_mix FROM purchase_batches WHERE user_id = ${userId} AND idempotency_key = ${idempotencyKey} FOR UPDATE`;
    if (existing) return existing;
    const credits = await tx<{ id: string; available_cents: number }[]>`
      SELECT id, amount_cents - allocated_cents AS available_cents FROM test_usdc_credits
      WHERE user_id = ${userId} AND embedded_wallet_address = ${walletAddress} AND state = 'available' AND amount_cents > allocated_cents
      ORDER BY created_at FOR UPDATE
    `;
    let remaining = amountCents as number;
    if (credits.reduce((total, credit) => total + credit.available_cents, 0) < remaining) throw new Response(JSON.stringify({ error: 'Insufficient reconciled test-USDC credit for this devnet allocation.' }), { status: 409 });
    const [created] = await tx<BatchRow[]>`
      INSERT INTO purchase_batches (user_id, idempotency_key, state, amount_cents, wallet_address, allocation_mix)
      VALUES (${userId}, ${idempotencyKey}, 'approved', ${amountCents as number}, ${walletAddress}, ${typedMix}::jsonb)
      RETURNING id, state, amount_cents, wallet_address, allocation_mix
    `;
    for (const credit of credits) {
      if (!remaining) break;
      const reserved = Math.min(remaining, credit.available_cents);
      await tx`UPDATE test_usdc_credits SET allocated_cents = allocated_cents + ${reserved}, updated_at = now() WHERE id = ${credit.id}`;
      await tx`INSERT INTO execution_credit_reservations (purchase_batch_id, test_usdc_credit_id, amount_cents) VALUES (${created.id}, ${credit.id}, ${reserved})`;
      remaining -= reserved;
    }
    return created;
  });
  const [existingReceipt] = await sql<{ id: string; state: string; receipt: unknown }[]>`
    SELECT id, state, receipt FROM execution_receipts WHERE purchase_batch_id = ${batch.id} ORDER BY created_at DESC LIMIT 1
  `;
  if (existingReceipt) return { id: existingReceipt.id, state: existingReceipt.state, receipt: existingReceipt.receipt, reused: true };
  const mirrors = await sql<MirrorRow[]>`SELECT symbol, mint_address, name, token_symbol FROM devnet_mirrors`;
  const allocations = allocationUnits(batch.amount_cents, typedMix).map((leg) => {
    const mirror = mirrors.find((candidate) => candidate.symbol === leg.symbol);
    if (!mirror) throw new Response(JSON.stringify({ error: `Devnet mirror ${leg.symbol} has not been bootstrapped.` }), { status: 409 });
    return { symbol: leg.symbol, mintAddress: mirror.mint_address, units: leg.units };
  });
  // Persist intent before touching Solana. A timeout or process failure can
  // leave an individual transaction uncertain; never submit this batch again
  // until it is manually reconciled from the recorded state.
  const intent = receiptFor(batch, [], 'submitting');
  const [saved] = await sql<{ id: string }[]>`
    INSERT INTO execution_receipts (purchase_batch_id, idempotency_key, state, receipt) VALUES (${batch.id}, ${idempotencyKey}, 'submitting', ${intent}::jsonb) RETURNING id
  `;
  await sql`UPDATE purchase_batches SET state = 'submitted', submitted_at = now() WHERE id = ${batch.id}`;
  try {
    const legs = await adapter.allocate({ walletAddress, legs: allocations, idempotencyKey });
    const receipt = receiptFor(batch, legs, 'submitted');
    await sql`UPDATE execution_receipts SET state = 'submitted', receipt = ${receipt}::jsonb WHERE id = ${saved.id}`;
    return { id: saved.id, state: 'submitted', receipt, reused: false };
  } catch (error) {
    // Do not retry an uncertain chain submission: the receipt remains
    // `submitting` with its durable intent and reserved test-USDC credit.
    throw error;
  }
}

export async function reconcileExecution(sql: Database, userId: string, receiptId: string, adapter: DevnetExecutionAdapter) {
  const [row] = await sql<{ id: string; batch_id: string; state: string; receipt: { legs?: DevnetLegReceipt[] } }[]>`
    SELECT receipt.id, receipt.purchase_batch_id AS batch_id, receipt.state, receipt.receipt
    FROM execution_receipts AS receipt JOIN purchase_batches AS batch ON batch.id = receipt.purchase_batch_id
    WHERE receipt.id = ${receiptId} AND batch.user_id = ${userId} FOR UPDATE
  `;
  if (!row) throw new Response(JSON.stringify({ error: 'Execution receipt was not found.' }), { status: 404 });
  const signatures = row.receipt.legs?.map((leg) => leg.signature) ?? [];
  const confirmed = signatures.length > 0 && (await Promise.all(signatures.map((signature) => adapter.confirm(signature)))).every(Boolean);
  if (confirmed) {
    await sql`UPDATE execution_receipts SET state = 'confirmed', receipt = jsonb_set(receipt, '{state}', '"confirmed"'::jsonb) WHERE id = ${row.id}`;
    await sql`UPDATE purchase_batches SET state = 'confirmed', confirmed_at = now() WHERE id = ${row.batch_id}`;
  }
  return { id: row.id, state: confirmed ? 'confirmed' : row.state, confirmed };
}
