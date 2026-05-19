// Pure selectors over the GeoJSON FeatureCollections, shared by the
// StatsPanel alerts and covered by unit tests.

export function overloadedLines(lines) {
  return (lines?.features ?? [])
    .filter((f) => Number(f.properties.loading_percent) > 100)
    .sort(
      (a, b) =>
        Number(b.properties.loading_percent) -
        Number(a.properties.loading_percent),
    );
}

export function voltageViolations(buses) {
  return (buses?.features ?? [])
    .filter((f) => {
      const pu = f.properties.vm_pu;
      return pu != null && (pu < 0.95 || pu > 1.05);
    })
    .sort(
      (a, b) =>
        Math.abs(b.properties.vm_pu - 1) - Math.abs(a.properties.vm_pu - 1),
    );
}

export function featureCenter(g) {
  if (g.type === "Point") {
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  }
  const cs = g.coordinates;
  const m = cs[Math.floor(cs.length / 2)] ?? cs[0];
  return { lng: m[0], lat: m[1] };
}
