import { signSession } from '../../../_utils/session.js';
import { getCookie } from '../../../_utils/cookies.js';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieHeader = request.headers.get('Cookie') || '';
  const stateCookie = getCookie(cookieHeader, 'oauth_state');

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return new Response('Sign-in failed: invalid or expired state. Please try signing in again.', { status: 400 });
  }

  const redirectUri = `${url.origin}/api/auth/callback/google`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenRes.ok) {
    return new Response('Sign-in failed: could not exchange authorization code with Google.', { status: 502 });
  }
  const tokenData = await tokenRes.json();

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!userRes.ok) {
    return new Response('Sign-in failed: could not fetch your Google profile.', { status: 502 });
  }
  const profile = await userRes.json();
  // profile has: sub, email, name, picture

  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO users (google_sub, email, display_name, avatar_url, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(google_sub) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url`
  ).bind(profile.sub, profile.email, profile.name, profile.picture || null, now).run();

  const userRow = await env.DB.prepare(
    'SELECT id FROM users WHERE google_sub = ?'
  ).bind(profile.sub).first();

  const sessionToken = await signSession(
    { userId: userRow.id, exp: now + SESSION_MAX_AGE_SECONDS * 1000 },
    env.SESSION_SECRET
  );

  const headers = new Headers();
  headers.set('Location', '/game.html');
  headers.append(
    'Set-Cookie',
    `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`
  );
  headers.append('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');
  return new Response(null, { status: 302, headers });
}
