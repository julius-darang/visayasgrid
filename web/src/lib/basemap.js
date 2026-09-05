const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// No credentials are needed for the default provider. A CARTO key opts
// into the original light/dark styles; it is a public browser credential.
export function basemapFor(theme, cartoKey = '') {
  const key = cartoKey.trim();
  if (!key) {
    return {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    };
  }
  const style = theme === 'dark' ? 'dark_all' : 'light_all';
  return {
    url: `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
    attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    subdomains: 'abcd',
    maxZoom: 19,
  };
}
