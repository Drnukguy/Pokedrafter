import { resolveAvatarUrl } from '../_utils/avatar.js';
import { getProfileStats } from '../_utils/profileStats.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id'), 10);

  if (!Number.isInteger(id)) {
    return json({ error: 'Invalid profile id.' }, 400);
  }

  // Deliberately select only what's safe to show anyone - no email, no google_sub.
  const user = await env.DB.prepare(
    'SELECT id, display_name, custom_display_name, avatar_url, favorite_pokemon_id, name_color, created_at FROM users WHERE id = ?'
  ).bind(id).first();

  if (!user) return json({ error: 'Profile not found.' }, 404);

  const stats = await getProfileStats(env, id);

  return json({
    id: user.id,
    name: user.custom_display_name || user.display_name,
    avatar: resolveAvatarUrl(user),
    nameColor: user.name_color || null,
    memberSince: user.created_at,
    ...stats
  });
}
