import type { Database } from './db';

const textEncoder = new TextEncoder();

function decodeBase58(value: string) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = [0];
  for (const character of value) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Wallet address is not valid base58.');
    let carry = index;
    for (let i = 0; i < bytes.length; i += 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const character of value) {
    if (character !== '1') break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

function ownershipMessage(address: string, nonce: string, expiresAt: Date) {
  return `Roundup wallet ownership proof\nAddress: ${address}\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}\nThis grants read-only tracking only; it cannot move funds.`;
}

export async function issueWalletChallenge(sql: Database, userId: string, address: string) {
  if (decodeBase58(address).length !== 32) throw new Response(JSON.stringify({ error: 'Wallet address must be a 32-byte Solana public key.' }), { status: 400 });
  return sql.begin(async (transaction) => {
    const [connection] = await transaction<{ id: string; user_id: string }[]>`
      INSERT INTO wallet_connections (user_id, address, kind, tracking_state)
      VALUES (${userId}, ${address}, 'external', 'pending_proof')
      ON CONFLICT (address) DO UPDATE SET updated_at = now()
      RETURNING id, user_id
    `;
    if (connection.user_id !== userId) throw new Response(JSON.stringify({ error: 'This wallet is already connected to another account.' }), { status: 409 });
    const id = crypto.randomUUID();
    const nonce = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    const message = ownershipMessage(address, nonce, expiresAt);
    await transaction`
      INSERT INTO wallet_ownership_challenges (id, wallet_connection_id, user_id, nonce, message, expires_at)
      VALUES (${id}, ${connection.id}, ${userId}, ${nonce}, ${message}, ${expiresAt.toISOString()})
    `;
    return { challengeId: id, message, expiresAt: expiresAt.toISOString() };
  });
}

export async function verifyWalletChallenge(sql: Database, userId: string, challengeId: string, address: string, signature: string) {
  const result = await sql.begin(async (transaction) => {
    const [challenge] = await transaction<{ id: string; wallet_connection_id: string; message: string; expires_at: string; used_at: string | null }[]>`
      SELECT challenge.id, challenge.wallet_connection_id, challenge.message, challenge.expires_at, challenge.used_at
      FROM wallet_ownership_challenges AS challenge
      JOIN wallet_connections AS wallet ON wallet.id = challenge.wallet_connection_id
      WHERE challenge.id = ${challengeId} AND challenge.user_id = ${userId} AND wallet.address = ${address}
      FOR UPDATE
    `;
    if (!challenge) throw new Response(JSON.stringify({ error: 'Ownership challenge not found.' }), { status: 404 });
    if (challenge.used_at) throw new Response(JSON.stringify({ error: 'Ownership challenge was already used.' }), { status: 409 });
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await transaction`UPDATE wallet_ownership_challenges SET used_at = now(), verification_result = 'expired' WHERE id = ${challenge.id}`;
      await transaction`UPDATE wallet_connections SET tracking_state = 'rejected', updated_at = now() WHERE id = ${challenge.wallet_connection_id}`;
      return { failure: new Response(JSON.stringify({ error: 'Ownership challenge expired. Request a new one.' }), { status: 410 }) };
    }
    let valid = false;
    try {
      const key = await crypto.subtle.importKey('raw', decodeBase58(address), { name: 'Ed25519' }, false, ['verify']);
      valid = await crypto.subtle.verify('Ed25519', key, Buffer.from(signature, 'base64'), textEncoder.encode(challenge.message));
    } catch {
      valid = false;
    }
    if (!valid) {
      await transaction`UPDATE wallet_ownership_challenges SET used_at = now(), proof_signature = ${signature}, verification_result = 'invalid' WHERE id = ${challenge.id}`;
      await transaction`UPDATE wallet_connections SET tracking_state = 'rejected', updated_at = now() WHERE id = ${challenge.wallet_connection_id}`;
      return { failure: new Response(JSON.stringify({ error: 'Wallet signature could not verify ownership.' }), { status: 400 }) };
    }
    await transaction`UPDATE wallet_ownership_challenges SET used_at = now(), proof_signature = ${signature}, verification_result = 'verified' WHERE id = ${challenge.id}`;
    await transaction`UPDATE wallet_connections SET tracking_state = 'tracked', proof_verified_at = now(), updated_at = now() WHERE id = ${challenge.wallet_connection_id}`;
    return { address, trackingState: 'tracked' };
  });
  if ('failure' in result) throw result.failure;
  return result;
}
