import { describe, expect, it } from 'vitest';
import { basemapFor } from './basemap.js';

describe('basemapFor', () => {
  it.each(['light', 'dark'])('uses a key-free OSM map without credentials in %s mode', (theme) => {
    const map = basemapFor(theme);
    expect(map.url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(map.attribution).toContain('https://www.openstreetmap.org/copyright');
    expect(map.attribution).not.toContain('CARTO');
  });
  it.each([['light', 'light_all'], ['dark', 'dark_all']])('keeps the CARTO %s style when a key is supplied', (theme, style) => {
    const map = basemapFor(theme, 'test key&value');
    expect(map.url).toBe(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png?key=test%20key%26value`);
    expect(map.attribution).toContain('https://carto.com/attributions');
    expect(map.attribution).toContain('https://www.openstreetmap.org/copyright');
  });
  it('treats whitespace-only configuration as missing', () => {
    expect(basemapFor('dark', '  ').url).toBe('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  });
});
