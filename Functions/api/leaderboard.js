export async function onRequestGet({ env }) {
  // For each user, take only their single best attempt (highest wins, then highest
  // score, then earliest if still tied) using a window function, then rank those.
  const { results } = await env.DB.prepare(`
    WITH ranked AS (
      SELECT
        r.user_id, r.team_json, r.combined_score, r.wins, r.losses, r.rank_label, r.created_at,
        u.display_name, u.custom_display_name, u.avatar_url,
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
    LIMIT 50
  `).all();

  const entries = results.map(row => ({
    name: row.custom_display_name || row.display_name,
    avatar: row.avatar_url,
    team: JSON.parse(row.team_json),
    combinedScore: row.combined_score,
    wins: row.wins,
    losses: row.losses,
    rank: row.rank_label,
    createdAt: row.created_at
  }));

  return new Response(JSON.stringify({ entries }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
