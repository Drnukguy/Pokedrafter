import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';
import POKEDEX from '../../_utils/pokedex.json';

const VALID_POKEMON_IDS = new Set(POKEDEX.map(p => p.id));

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

async function requireUser(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = getCookie(cookieHeader, 'session');
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;
  if (!payload || !payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

export async function onRequestGet({ request, env }) {
  const payload = await requireUser(request, env);
  if (!payload) return json({ error: 'Not signed in.' }, 401);

  const user = await env.DB.prepare(
    'SELECT display_name, custom_display_name, favorite_pokemon_id FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return json({ error: 'User not found.' }, 404);

  return json({
    googleName: user.display_name,
    customName: user.custom_display_name || null,
    effectiveName: user.custom_display_name || user.display_name,
    favoritePokemonId: user.favorite_pokemon_id || null
  });
}

export async function onRequestPost({ request, env }) {
  const payload = await requireUser(request, env);
  if (!payload) return json({ error: 'Not signed in.' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  // Reset display name back to the Google-provided one
  if (body.reset === true) {
    await env.DB.prepare('UPDATE users SET custom_display_name = NULL WHERE id = ?').bind(payload.userId).run();
    const user = await env.DB.prepare('SELECT display_name FROM users WHERE id = ?').bind(payload.userId).first();
    return json({ ok: true, effectiveName: user.display_name });
  }

  // Clear favorite Pokemon (avatar reverts to Google photo, or the initial-letter fallback)
  if (body.clearFavorite === true) {
    await env.DB.prepare('UPDATE users SET favorite_pokemon_id = NULL WHERE id = ?').bind(payload.userId).run();
    return json({ ok: true, favoritePokemonId: null });
  }

  // Set favorite Pokemon - any of the 1025 species is valid, not just draftable ones
  if (body.favoritePokemonId !== undefined) {
    const id = parseInt(body.favoritePokemonId, 10);
    if (!Number.isInteger(id) || !VALID_POKEMON_IDS.has(id)) {
      return json({ error: 'Not a valid Pok\u00e9mon.' }, 400);
    }
    await env.DB.prepare('UPDATE users SET favorite_pokemon_id = ? WHERE id = ?').bind(id, payload.userId).run();
    return json({ ok: true, favoritePokemonId: id });
  }

  // Otherwise, this is a display name update
  let name = typeof body.displayName === 'string' ? body.displayName : '';
  name = name.replace(/[\x00-\x1F\x7F]/g, '').trim(); // strip control characters, trim whitespace

  if (name.length === 0) {
    return json({ error: 'Display name cannot be empty.' }, 400);
  }
  if (name.length > 20) {
    return json({ error: 'Display name must be 20 characters or fewer.' }, 400);
  }

  await env.DB.prepare(
    'UPDATE users SET custom_display_name = ? WHERE id = ?'
  ).bind(name, payload.userId).run();

  return json({ ok: true, effectiveName: name });
}
