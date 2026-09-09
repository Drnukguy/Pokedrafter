export function resolveAvatarUrl(row) {
  if (row.favorite_pokemon_id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${row.favorite_pokemon_id}.png`;
  }
  return row.avatar_url || null;
}
