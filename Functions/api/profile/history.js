import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';

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

  const { results } = await env.DB.prepare(`
    SELECT team_json, combined_score, wins, losses, rank_label, created_at
    FROM results
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).bind(payload.userId).all();

  const history = results.map(row => ({
    team: JSON.parse(row.team_json),
    combinedScore: row.combined_score,
    wins: row.wins,
    losses: row.losses,
    rank: row.rank_label,
    createdAt: row.created_at
  }));

  return json({ history });
}
