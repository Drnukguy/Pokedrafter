// The complete achievement catalog. Each entry is fully self-contained: a key
// (stored permanently once unlocked, never rename these), display info, an
// icon, a check function run against a user's full result history, and an
// optional auto-applied reward. Adding a new achievement later means adding
// one new entry here - nothing else in the system needs to change.

const STARTER_FINAL_EVOLUTIONS = new Set([
  'venusaur', 'charizard', 'blastoise',
  'meganium', 'typhlosion', 'feraligatr',
  'sceptile', 'blaziken', 'swampert',
  'torterra', 'infernape', 'empoleon',
  'serperior', 'emboar', 'samurott',
  'chesnaught', 'delphox', 'greninja',
  'decidueye', 'incineroar', 'primarina',
  'rillaboom', 'cinderace', 'inteleon',
  'meowscarada', 'skeledirge', 'quaquaval'
]);

const PSEUDO_LEGENDARIES = new Set([
  'dragonite', 'tyranitar', 'salamence', 'garchomp',
  'hydreigon', 'goodra', 'kommo-o', 'dragapult', 'baxcalibur'
]);

const PARADOX_IDS = new Set([
  984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1005, 1006,
  1009, 1010, 1020, 1021, 1022, 1023
]);

const EFFICIENT_CHAMPION_MAX_SCORE = 1520;

function countSeasons(results) {
  return results.length;
}

function countPerfects(results) {
  return results.filter(r => r.wins === 13).length;
}

function hasStarterLegacy(results) {
  return results.some(r =>
    r.team.filter(p => STARTER_FINAL_EVOLUTIONS.has(p.name.toLowerCase())).length >= 5
  );
}

function hasParadoxProtocol(results) {
  return results.some(r => {
    const legendaryPick = r.team[5]; // slot index 5 = the Legendary round, always last
    return legendaryPick && PARADOX_IDS.has(legendaryPick.id);
  });
}

function hasPseudoSquad(results) {
  return results.some(r =>
    r.team.filter(p => PSEUDO_LEGENDARIES.has(p.name.toLowerCase())).length >= 2
  );
}

function hasEfficientChampion(results) {
  return results.some(r => r.wins === 13 && r.combinedScore <= EFFICIENT_CHAMPION_MAX_SCORE);
}

export const ACHIEVEMENTS = [
  // --- Total seasons played: auto-applies a name color per tier ---
  { key: 'seasons_1', name: 'Rookie Trainer', description: 'Complete your first season.',
    category: 'seasons', icon: 'items/oval-stone.png',
    check: r => countSeasons(r) >= 1, reward: { type: 'name_color', value: '#8a8a8a' } },
  { key: 'seasons_50', name: 'Seasoned Drafter', description: 'Complete 50 seasons.',
    category: 'seasons', icon: 'items/rare-candy.png',
    check: r => countSeasons(r) >= 50, reward: { type: 'name_color', value: '#4a7fb5' } },
  { key: 'seasons_100', name: 'Veteran', description: 'Complete 100 seasons.',
    category: 'seasons', icon: 'items/exp-share.png',
    check: r => countSeasons(r) >= 100, reward: { type: 'name_color', value: '#2f8f4e' } },
  { key: 'seasons_500', name: 'Elite Drafter', description: 'Complete 500 seasons.',
    category: 'seasons', icon: 'items/lucky-egg.png',
    check: r => countSeasons(r) >= 500, reward: { type: 'name_color', value: '#b3801f' } },
  { key: 'seasons_1000', name: 'Legend', description: 'Complete 1,000 seasons. Unlocks a custom name color.',
    category: 'seasons', icon: 'items/metal-coat.png',
    check: r => countSeasons(r) >= 1000, reward: { type: 'custom_color_unlock' } },

  // --- Perfect seasons: auto-applies a name effect per tier ---
  { key: 'perfect_1', name: 'First Perfect', description: 'Go 13-0 for the first time.',
    category: 'perfect', icon: 'items/shiny-stone.png',
    check: r => countPerfects(r) >= 1, reward: { type: 'name_effect', value: 'glow' } },
  { key: 'perfect_5', name: 'Dynasty', description: 'Go 13-0 five times.',
    category: 'perfect', icon: 'items/dawn-stone.png',
    check: r => countPerfects(r) >= 5, reward: { type: 'name_effect', value: 'shimmer' } },
  { key: 'perfect_25', name: 'Immortal', description: 'Go 13-0 twenty-five times.',
    category: 'perfect', icon: 'items/dusk-stone.png',
    check: r => countPerfects(r) >= 25, reward: { type: 'name_effect', value: 'glow-strong' } },
  { key: 'perfect_50', name: 'Untouchable', description: 'Go 13-0 fifty times.',
    category: 'perfect', icon: 'items/ice-stone.png',
    check: r => countPerfects(r) >= 50, reward: { type: 'name_effect', value: 'shimmer-strong' } },

  // --- Quirky: trophy-case badges only, no name reward ---
  { key: 'starters_legacy', name: "Starter's Legacy",
    description: 'Draft 5 starter final evolutions onto a single team.',
    category: 'quirky', icon: 'badges/boulder-badge.png',
    check: hasStarterLegacy, reward: null },
  { key: 'paradox_protocol', name: 'Paradox Protocol',
    description: 'Draft a Paradox Pok\u00e9mon into your Legendary round.',
    category: 'quirky', icon: 'badges/cascade-badge.png',
    check: hasParadoxProtocol, reward: null },
  { key: 'pseudo_squad', name: 'Pseudo Squad',
    description: 'Draft 2 or more pseudo-legendaries onto a single team.',
    category: 'quirky', icon: 'badges/thunder-badge.png',
    check: hasPseudoSquad, reward: null },
  { key: 'efficient_champion', name: 'Efficient Champion',
    description: `Win a perfect season with a combined score of ${EFFICIENT_CHAMPION_MAX_SCORE} or less.`,
    category: 'quirky', icon: 'badges/rainbow-badge.png',
    check: hasEfficientChampion, reward: null }
];
