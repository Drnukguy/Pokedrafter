import { resolveAvatarUrl } from '../_utils/avatar.js';

const PAGE_SIZE = 20;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  let page = parseInt(url.searchParams.get('page'), 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  const offset = (page - 1) * PAGE_SIZE;

  // Three independent queries run together: the current page of results, the
  // total distinct player count (for "page X of Y"), and how many players have
  // ever posted a perfect 13-0 - each on a "best attempt per user" basis.
  const [mainResult, totalResult, perfectResult] = await Promise.all([
    env.DB.prepare(`
      WITH ranked AS (
        SELECT
          r.user_id, r.team_json, r.combined_score, r.wins, r.losses, r.rank_label, r.created_at,
          u.display_name, u.custom_display_name, u.avatar_url, u.favorite_pokemon_id, u.name_color,
          ROW_NUMBER() OVER (
            PARTITION BY r.user_id
            ORDER BY r.wins DESC, r.combined_score DESC, r.created_at ASC
          ) AS rn
        FROM results r
        JOIN users u ON u.id = r.user_id
      )
      SELECT * FROM ranked
      WHERE rn = 1
      ORDER BY wins DESC, combined_score DESC
      LIMIT ? OFFSET ?
    `).bind(PAGE_SIZE, offset).all(),

    env.DB.prepare(`SELECT COUNT(DISTINCT user_id) AS total FROM results`).first(),

    env.DB.prepare(`
      WITH ranked AS (
        SELECT r.user_id, r.wins,
          ROW_NUMBER() OVER (
            PARTITION BY r.user_id
            ORDER BY r.wins DESC, r.combined_score DESC, r.created_at ASC
          ) AS rn
        FROM results r
      )
      SELECT COUNT(*) AS perfect FROM ranked WHERE rn = 1 AND wins = 13
    `).first()
  ]);

  const entries = mainResult.results.map(row => ({
    id: row.user_id,
    name: row.custom_display_name || row.display_name,
    avatar: resolveAvatarUrl(row),
    nameColor: row.name_color || null,
    team: JSON.parse(row.team_json),
    combinedScore: row.combined_score,
    wins: row.wins,
    losses: row.losses,
    rank: row.rank_label,
    createdAt: row.created_at
  }));

  const totalPlayers = totalResult ? totalResult.total : 0;
  const totalPages = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));

  return new Response(JSON.stringify({
    entries,
    page,
    totalPages,
    totalPlayers,
    perfectRuns: perfectResult ? perfectResult.perfect : 0
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
