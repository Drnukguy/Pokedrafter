import { ACHIEVEMENTS } from './achievements.js';

// Checks a user's full result history against every achievement in the
// catalog, grants any newly-qualified ones, and applies their auto-tier
// reward (name color / effect) unless the user has since set a custom color.
// Safe to call repeatedly - already-granted achievements are skipped - so the
// exact same code path handles both a real-time check after a new submission
// and a retroactive backfill for a user's pre-existing history.
export async function checkAndGrantAchievements(env, userId) {
  const { results: rawResults } = await env.DB.prepare(
    'SELECT team_json, combined_score, wins, losses FROM results WHERE user_id = ?'
  ).bind(userId).all();

  const results = rawResults.map(r => ({
    team: JSON.parse(r.team_json),
    combinedScore: r.combined_score,
    wins: r.wins,
    losses: r.losses
  }));

  const { results: existingRows } = await env.DB.prepare(
    'SELECT achievement_key FROM achievements WHERE user_id = ?'
  ).bind(userId).all();
  const alreadyUnlocked = new Set(existingRows.map(r => r.achievement_key));

  const user = await env.DB.prepare(
    'SELECT has_custom_color FROM users WHERE id = ?'
  ).bind(userId).first();
  const hasCustomColor = !!(user && user.has_custom_color);

  const newlyUnlocked = [];
  const now = Date.now();

  for (const ach of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(ach.key)) continue;
    if (!ach.check(results)) continue;

    await env.DB.prepare(
      'INSERT INTO achievements (user_id, achievement_key, unlocked_at) VALUES (?, ?, ?)'
    ).bind(userId, ach.key, now).run();
    newlyUnlocked.push({ key: ach.key, name: ach.name, description: ach.description, icon: ach.icon });

    if (ach.reward) {
      if (ach.reward.type === 'name_color' && !hasCustomColor) {
        await env.DB.prepare('UPDATE users SET name_color = ? WHERE id = ?')
          .bind(ach.reward.value, userId).run();
      } else if (ach.reward.type === 'name_effect') {
        await env.DB.prepare('UPDATE users SET name_effect = ? WHERE id = ?')
          .bind(ach.reward.value, userId).run();
      }
      // custom_color_unlock grants no direct value here - it just means the
      // user is now allowed to set one via settings, checked separately.
    }
  }

  return newlyUnlocked;
}

// Fetches a user's unlocked achievements, joined with catalog display info,
// for rendering a trophy case (used by both the private and public profile).
export async function getUnlockedAchievements(env, userId) {
  const { results } = await env.DB.prepare(
    'SELECT achievement_key, unlocked_at FROM achievements WHERE user_id = ? ORDER BY unlocked_at ASC'
  ).bind(userId).all();

  const catalogByKey = new Map(ACHIEVEMENTS.map(a => [a.key, a]));

  return results
    .map(r => {
      const ach = catalogByKey.get(r.achievement_key);
      if (!ach) return null;
      return {
        key: ach.key,
        name: ach.name,
        description: ach.description,
        category: ach.category,
        icon: ach.icon,
        unlockedAt: r.unlocked_at
      };
    })
    .filter(Boolean);
}

export function hasCustomColorUnlock(unlockedKeys) {
  return unlockedKeys.includes('seasons_1000');
}
