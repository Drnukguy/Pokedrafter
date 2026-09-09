import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';
import { getProfileStats } from '../../_utils/profileStats.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = getCookie(cookieHeader, 'session');
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;

  if (!payload || !payload.exp || payload.exp < Date.now()) {
    return json({ error: 'Not signed in.' }, 401);
  }

  const user = await env.DB.prepare(
    'SELECT created_at, name_color FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return json({ error: 'User not found.' }, 404);

  const stats = await getProfileStats(env, payload.userId);

  return json({
    memberSince: user.created_at,
    nameColor: user.name_color || null,
    publicProfileId: payload.userId,
    ...stats
  });
}
