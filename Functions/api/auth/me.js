import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';
import { resolveAvatarUrl } from '../../_utils/avatar.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = getCookie(cookieHeader, 'session');
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;

  if (!payload || !payload.exp || payload.exp < Date.now()) {
    return json({ loggedIn: false });
  }

  const user = await env.DB.prepare(
    'SELECT id, COALESCE(custom_display_name, display_name) as display_name, avatar_url, favorite_pokemon_id FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return json({ loggedIn: false });

  return json({
    loggedIn: true,
    user: { id: user.id, name: user.display_name, avatar: resolveAvatarUrl(user) }
  });
}
