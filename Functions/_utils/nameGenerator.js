import POKEDEX from './pokedex.json';

const ADJECTIVES = [
  'Swift', 'Mighty', 'Brave', 'Silent', 'Blazing', 'Frozen', 'Golden', 'Shadow',
  'Radiant', 'Fierce', 'Noble', 'Wild', 'Crimson', 'Azure', 'Emerald', 'Silver',
  'Cosmic', 'Thunder', 'Storm', 'Mystic', 'Rogue', 'Ancient', 'Bold', 'Clever',
  'Daring', 'Electric', 'Feral', 'Grim', 'Hidden', 'Iron', 'Jolly', 'Keen',
  'Lucky', 'Midnight', 'Nimble', 'Obsidian', 'Prime', 'Quick', 'Rapid', 'Solar',
  'Titan', 'Ultra', 'Valiant', 'Wandering', 'Zealous', 'Arctic', 'Crystal',
  'Dusk', 'Echo', 'Flare', 'Gale', 'Howling', 'Ivory', 'Jade', 'Lunar',
  'Marble', 'Neon', 'Onyx', 'Phantom', 'Quartz', 'Rustic', 'Savage', 'Turbo',
  'Vivid', 'Wicked', 'Zesty'
];

function formatMonName(raw) {
  return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

// No collision checking by design for now - duplicates are cosmetically
// possible but harmless, since every account is actually identified
// internally by its numeric id, never by display name. Worth revisiting if
// the userbase grows enough that duplicates start feeling common.
export function generateRandomUsername() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const mon = POKEDEX[Math.floor(Math.random() * POKEDEX.length)];
  const number = Math.floor(Math.random() * 9990) + 10; // 2-4 digit range
  return `${adjective}${formatMonName(mon.n)}${number}`;
}
