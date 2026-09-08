import POKEDEX from './pokedex.json';

// This module is the security-critical piece of the whole backend: it independently
// recomputes a submitted team's score and season result from just the 6 Pokemon IDs,
// using the server's own bundled copy of the dataset. The client's own claimed score,
// wins, losses, or rank are never trusted - only the raw IDs are, and everything else
// is derived here. This mirrors the exact scoring logic in game.html; if that ever
// changes, this file needs to change with it or results will disagree between the
// two.

function bstOf(p) {
  return p.s.hp + p.s.atk + p.s.def + p.s.spa + p.s.spd + p.s.spe;
}

function balanceMetric(p) {
  const s = p.s;
  return Math.sqrt(s.hp) + Math.sqrt(s.atk) + Math.sqrt(s.def) + Math.sqrt(s.spa) + Math.sqrt(s.spd) + Math.sqrt(s.spe);
}

const SCORE_MIN = 1;
const SCORE_MAX = 300;

const POPULARITY_BONUS = {
  greninja: 15, frogadier: 15, froakie: 15,
  lucario: 13, riolu: 13,
  mimikyu: 11,
  charizard: 10, charmeleon: 10, charmander: 10,
  umbreon: 8, eevee: 8,
  sylveon: 7,
  garchomp: 6, gabite: 6, gible: 6,
  rayquaza: 5,
  gardevoir: 4, kirlia: 4, ralts: 4,
  gengar: 3, haunter: 3, gastly: 3
};

POKEDEX.forEach(p => { p.bst = bstOf(p); p.balance = balanceMetric(p); });
const BAL_MIN = Math.min(...POKEDEX.map(p => p.balance));
const BAL_MAX = Math.max(...POKEDEX.map(p => p.balance));

function scoreFromBalance(balance) {
  return Math.round(SCORE_MIN + ((balance - BAL_MIN) / (BAL_MAX - BAL_MIN)) * (SCORE_MAX - SCORE_MIN));
}

POKEDEX.forEach(p => {
  const base = scoreFromBalance(p.balance);
  const bonus = POPULARITY_BONUS[p.n] || 0;
  p.score = Math.min(SCORE_MAX, base + bonus);
});

const POKEDEX_BY_ID = new Map(POKEDEX.map(p => [p.id, p]));

// Order and role of the 6 real draft slots, in the order the client always fills them.
const SLOT_KEYS = ['basic', 'mid', 'final', 'legendary', 'bench', 'bench'];
const SLOT_DISPLAY_LABELS = [
  'Starter Evolution', 'Intermediate Evolution', 'Final Evolution',
  'Legendary / Mythical', 'Bench', 'Bench'
];

function slotMatches(slotKey, p) {
  if (slotKey === 'legendary') return !!(p.leg || p.myt);
  if (slotKey === 'bench') return true;
  return !(p.leg || p.myt) && p.st === slotKey;
}

const REFERENCE_RATING = 1400;
const STAGE_TARGET_FRACTIONS = [
  0.30, 0.40, 0.48, 0.55, 0.62, 0.69, 0.75, 0.81,
  0.85, 0.89, 0.93, 0.96,
  1.00
];

const RANKS = [
  { min: 13, label: 'S' },
  { min: 12, label: 'A+' },
  { min: 11, label: 'A' },
  { min: 10, label: 'A-' },
  { min: 9, label: 'B+' },
  { min: 8, label: 'B' },
  { min: 0, label: 'B-' }
];

function rankFor(wins) {
  return RANKS.find(r => wins >= r.min).label;
}

// Validates a submitted team (array of { id }) against the real draft rules and
// recomputes the authoritative score/record/rank server-side.
// Returns { ok: true, result } or { ok: false, error }.
export function validateAndScoreTeam(submittedTeam) {
  if (!Array.isArray(submittedTeam) || submittedTeam.length !== 6) {
    return { ok: false, error: 'Team must have exactly 6 Pok\u00e9mon.' };
  }

  const seenIds = new Set();
  const resolved = [];

  for (let i = 0; i < 6; i++) {
    const entry = submittedTeam[i];
    const id = entry && Number.isInteger(entry.id) ? entry.id : null;
    if (id === null) {
      return { ok: false, error: `Slot ${i + 1}: missing or invalid Pok\u00e9mon id.` };
    }

    const p = POKEDEX_BY_ID.get(id);
    if (!p) {
      return { ok: false, error: `Slot ${i + 1}: unknown Pok\u00e9mon id ${id}.` };
    }

    if (seenIds.has(id)) {
      return { ok: false, error: 'The same Pok\u00e9mon cannot appear twice on one team.' };
    }
    seenIds.add(id);

    const slotKey = SLOT_KEYS[i];
    if (!slotMatches(slotKey, p)) {
      return { ok: false, error: `Slot ${i + 1} (${SLOT_DISPLAY_LABELS[i]}): ${p.n} does not qualify for this role.` };
    }

    resolved.push({
      id: p.id,
      name: p.n,
      score: p.score,
      slotLabel: SLOT_DISPLAY_LABELS[i]
    });
  }

  const combinedScore = resolved.reduce((sum, p) => sum + p.score, 0);

  let wins = 0;
  for (const frac of STAGE_TARGET_FRACTIONS) {
    const difficulty = Math.round(frac * REFERENCE_RATING);
    if (combinedScore >= difficulty) wins++;
  }
  const losses = STAGE_TARGET_FRACTIONS.length - wins;

  return {
    ok: true,
    result: {
      team: resolved,
      combinedScore,
      wins,
      losses,
      rank: rankFor(wins)
    }
  };
}
