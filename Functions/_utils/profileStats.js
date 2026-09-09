// Computes the aggregate stats shown on both the private (self) and public
// profile pages, from the full result history - never from a LIMITed subset,
// so counts are always accurate regardless of how much history a page displays.
export async function getProfileStats(env, userId) {
  const [totalsRow, bestRow] = await Promise.all([
    env.DB.prepare(`
      SELECT
        COUNT(*) AS total_seasons,
        SUM(CASE WHEN wins = 13 THEN 1 ELSE 0 END) AS perfect_runs
      FROM results
      WHERE user_id = ?
    `).bind(userId).first(),

    env.DB.prepare(`
      SELECT team_json, combined_score, wins, losses, rank_label, created_at
      FROM results
      WHERE user_id = ?
      ORDER BY wins DESC, combined_score DESC, created_at ASC
      LIMIT 1
    `).bind(userId).first()
  ]);

  const totalSeasons = totalsRow ? totalsRow.total_seasons : 0;
  const perfectRuns = totalsRow ? (totalsRow.perfect_runs || 0) : 0;

  const bestResult = bestRow ? {
    team: JSON.parse(bestRow.team_json),
    combinedScore: bestRow.combined_score,
    wins: bestRow.wins,
    losses: bestRow.losses,
    rank: bestRow.rank_label,
    createdAt: bestRow.created_at
  } : null;

  return { totalSeasons, perfectRuns, bestResult };
}
