import { bearerToken, createPrivyTokenVerifier, type TokenVerifier } from './auth';
import { openDatabase, upsertUser, type Database } from './db';
import { readLedger, recordSourceEvent } from './ledger';
import { completeFinancialConnection, createFinancialConnection, createStripeAdapter, readFinancialConnections, receiveStripeWebhook, verifyStripeSignature, type StripeAdapter } from './stripe';
import { issueWalletChallenge, verifyWalletChallenge } from './walletOwnership';
import { exportAccountData, readPolicy, readProfile, savePolicy, updateProfile } from './account';
import { confirmFundingAttempt, createFundingAttempt, readFunding, reconcileFundingAttempt } from './funding';
import { createCliDevnetAdapter, createExecution, readExecutions, reconcileExecution, type DevnetExecutionAdapter } from './execution';
import { createTwelveDataAdapter, readPortfolioHistory, readReferenceMarketPrices, type MarketDataAdapter, type PortfolioHistoryRange } from './marketData';

type AppOptions = { sql?: Database; verifyToken?: TokenVerifier; stripe?: StripeAdapter; webhookSecret?: string; execution?: DevnetExecutionAdapter; marketData?: MarketDataAdapter };

const corsHeaders = {
  'access-control-allow-headers': 'authorization, content-type, idempotency-key',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-origin': process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:8081',
  vary: 'Origin',
};

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: corsHeaders });
}

async function requestUser(request: Request, sql: Database, verifyToken: TokenVerifier) {
  try {
    const identity = await verifyToken(bearerToken(request));
    return upsertUser(sql, identity.privyDid);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.warn('Privy access-token verification failed:', error instanceof Error ? error.message : 'unknown error');
    throw new Response(JSON.stringify({ error: 'Authentication could not be verified.' }), { status: 401 });
  }
}

function requireString(value: unknown, label: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Response(JSON.stringify({ error: `${label} is required.` }), { status: 400 });
  return value;
}

function requirePositiveCents(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Response(JSON.stringify({ error: 'amountCents must be a non-negative integer.' }), { status: 400 });
  return value as number;
}

export function createApp({ sql = openDatabase(), verifyToken = createPrivyTokenVerifier(), stripe = createStripeAdapter(), webhookSecret, execution = createCliDevnetAdapter(), marketData = createTwelveDataAdapter() }: AppOptions = {}) {
  return {
    async fetch(request: Request) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
      const url = new URL(request.url);
      try {
        if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true });
        if (request.method === 'POST' && url.pathname === '/v1/stripe/webhooks') {
          const payload = await request.text();
          if (!await verifyStripeSignature(payload, request.headers.get('stripe-signature'), webhookSecret)) return json({ error: 'Invalid Stripe webhook signature.' }, 400);
          return json(await receiveStripeWebhook(sql, payload, stripe));
        }
        const user = await requestUser(request, sql, verifyToken);
        if (request.method === 'GET' && url.pathname === '/v1/ledger') return json(await readLedger(sql, user.id));
        if (request.method === 'GET' && url.pathname === '/v1/funding') return json(await readFunding(sql, user.id));
        if (request.method === 'GET' && url.pathname === '/v1/executions') return json(await readExecutions(sql, user.id));
        if (request.method === 'GET' && url.pathname === '/v1/reference-market-prices') return json(await readReferenceMarketPrices(sql, marketData));
        if (request.method === 'GET' && url.pathname === '/v1/portfolio-history') {
          const range = url.searchParams.get('range');
          if (range !== '1D' && range !== '1W' && range !== '1M' && range !== '1Y' && range !== 'ALL') return json({ error: 'range must be 1D, 1W, 1M, 1Y, or ALL.' }, 400);
          return json(await readPortfolioHistory(sql, user.id, range as PortfolioHistoryRange, marketData));
        }
        if (request.method === 'GET' && url.pathname === '/v1/stripe/financial-connections') return json(await readFinancialConnections(sql, user.id));
        if (request.method === 'GET' && url.pathname === '/v1/profile') return json(await readProfile(sql, user.id));
        if (request.method === 'PUT' && url.pathname === '/v1/profile') return json(await updateProfile(sql, user.id, await request.json()));
        if (request.method === 'GET' && url.pathname === '/v1/policy') return json(await readPolicy(sql, user.id));
        if (request.method === 'POST' && url.pathname === '/v1/policy') return json(await savePolicy(sql, user.id, await request.json()), 201);
        if (request.method === 'GET' && url.pathname === '/v1/export') return json(await exportAccountData(sql, user.id));
        if (request.method === 'POST' && url.pathname === '/v1/funding/attempts') {
          const body = await request.json();
          return json(await createFundingAttempt(sql, user.id, requireString(body.walletAddress, 'walletAddress'), requirePositiveCents(body.amountCents), stripe), 201);
        }
        if (request.method === 'POST' && url.pathname === '/v1/funding/attempts/confirm') {
          const body = await request.json();
          return json(await confirmFundingAttempt(sql, user.id, requireString(body.attemptId, 'attemptId'), stripe));
        }
        if (request.method === 'POST' && url.pathname === '/v1/funding/attempts/reconcile') {
          const body = await request.json();
          return json(await reconcileFundingAttempt(sql, user.id, requireString(body.attemptId, 'attemptId'), stripe));
        }
        if (request.method === 'POST' && url.pathname === '/v1/executions') {
          const idempotencyKey = request.headers.get('idempotency-key');
          if (!idempotencyKey) return json({ error: 'Idempotency-Key is required.' }, 400);
          return json(await createExecution(sql, user.id, await request.json(), idempotencyKey, execution), 201);
        }
        if (request.method === 'POST' && url.pathname === '/v1/executions/reconcile') {
          const body = await request.json();
          return json(await reconcileExecution(sql, user.id, requireString(body.receiptId, 'receiptId'), execution));
        }
        if (request.method === 'POST' && url.pathname === '/v1/source-events') {
          const body = await request.json();
          const idempotencyKey = request.headers.get('idempotency-key');
          if (!idempotencyKey) return json({ error: 'Idempotency-Key is required.' }, 400);
          const result = await recordSourceEvent(sql, user.id, {
            source: requireString(body.source, 'source'),
            eventId: requireString(body.eventId, 'eventId'),
            amountCents: requirePositiveCents(body.amountCents),
            occurredAt: requireString(body.occurredAt, 'occurredAt'),
          }, idempotencyKey);
          return json(result, result.created ? 201 : 200);
        }
        if (request.method === 'POST' && url.pathname === '/v1/wallet-challenges') {
          const body = await request.json();
          return json(await issueWalletChallenge(sql, user.id, requireString(body.address, 'address')), 201);
        }
        if (request.method === 'POST' && url.pathname === '/v1/wallet-challenges/verify') {
          const body = await request.json();
          return json(await verifyWalletChallenge(
            sql,
            user.id,
            requireString(body.challengeId, 'challengeId'),
            requireString(body.address, 'address'),
            requireString(body.signature, 'signature'),
          ));
        }
        if (request.method === 'POST' && url.pathname === '/v1/stripe/financial-connections/sessions') return json(await createFinancialConnection(sql, user.id, stripe), 201);
        if (request.method === 'POST' && url.pathname === '/v1/stripe/financial-connections/complete') {
          const body = await request.json();
          return json(await completeFinancialConnection(sql, user.id, requireString(body.sessionId, 'sessionId'), stripe));
        }
        return json({ error: 'Not found.' }, 404);
      } catch (error) {
        if (error instanceof Response) {
          const body = await error.text();
          return new Response(body, { status: error.status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
        }
        console.error(error);
        return json({ error: 'Internal server error.' }, 500);
      }
    },
  };
}
