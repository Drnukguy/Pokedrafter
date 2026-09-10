import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';
import { getProfileStats } from '../../_utils/profileStats.js';
import { checkAndGrantAchievements, getUnlockedAchievements, hasCustomColorUnlock } from '../../_utils/achievementEngine.js';

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

  // Viewing your own profile is also when retroactive achievement backfill
  // happens - safe to call every time, since already-unlocked ones are skipped.
  await checkAndGrantAchievements(env, payload.userId);

  const user = await env.DB.prepare(
    'SELECT created_at, name_color, name_effect, has_custom_color FROM users WHERE id = ?'
  ).bind(payload.userId).first();

  if (!user) return json({ error: 'User not found.' }, 404);

  const stats = await getProfileStats(env, payload.userId);
  const achievements = await getUnlockedAchievements(env, payload.userId);

  return json({
    memberSince: user.created_at,
    nameColor: user.name_color || null,
    nameEffect: user.name_effect || null,
    canPickCustomColor: hasCustomColorUnlock(achievements.map(a => a.key)),
    hasCustomColor: !!user.has_custom_color,
    publicProfileId: payload.userId,
    achievements,
    ...stats
  });
}
