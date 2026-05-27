// season: 0=spring 1=summer 2=autumn 3=winter
// defender territory ID can bias the map choice for terrain flavor.
const SEASON_DEFAULT = { 0: 'field', 1: 'field', 2: 'mud', 3: 'field' };

const TERR_BIAS = {
  tibet:       'forest',
  korea:       'forest',
  south_china: 'river',
  arabia:      'mud',
  west_europe: 'mud',
};

export function seasonToMap(season, defTerr) {
  if (TERR_BIAS[defTerr.id]) return TERR_BIAS[defTerr.id];
  return SEASON_DEFAULT[season] ?? 'field';
}
