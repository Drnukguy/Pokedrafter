import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';
import { validateAndScoreTeam } from '../../_utils/scoring.js';
import { checkAndGrantAchievements } from '../../_utils/achievementEngine.js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = getCookie(cookieHeader, 'session');
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;

  if (!payload || !payload.exp || payload.exp < Date.now()) {
    return json({ error: 'Not signed in.' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  // The only thing trusted from the client is which 6 Pokemon IDs were drafted.
  // Everything else - scores, wins/losses, rank - is recomputed here from scratch.
  const validation = validateAndScoreTeam(body.team);
  if (!validation.ok) {
    return json({ error: validation.error }, 400);
  }

  const { result } = validation;
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO results (user_id, team_json, combined_score, wins, losses, rank_label, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    payload.userId,
    JSON.stringify(result.team),
    result.combinedScore,
    result.wins,
    result.losses,
    result.rank,
    now
  ).run();

  const newAchievements = await checkAndGrantAchievements(env, payload.userId);

  return json({ ok: true, result, newAchievements });
}
