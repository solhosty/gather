import { PrivyClient } from '@privy-io/node';

export type AuthenticatedUser = { privyDid: string };

export type TokenVerifier = (token: string) => Promise<AuthenticatedUser>;

export function createPrivyTokenVerifier(): TokenVerifier {
  const appId = process.env.EXPO_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new Error('EXPO_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET are required for API authentication.');
  const privy = new PrivyClient({ appId, appSecret });
  return async (token) => {
    const claims = await privy.utils().auth().verifyAccessToken(token);
    const userId = (claims as { userId?: string; user_id?: string }).userId
      ?? (claims as { user_id?: string }).user_id;
    if (!userId) throw new Error('Privy token has no user identifier.');
    return { privyDid: userId };
  };
}

export function bearerToken(request: Request) {
  const value = request.headers.get('authorization');
  if (!value?.startsWith('Bearer ')) throw new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 });
  return value.slice('Bearer '.length);
}
