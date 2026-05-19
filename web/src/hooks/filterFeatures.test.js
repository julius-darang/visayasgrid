import { describe, it, expect } from "vitest";
import { filterFeatures } from "./useGridData.js";

const fc = {
  type: "FeatureCollection",
  features: [
    { properties: { island: "Cebu", v_nom: 230 } },
    { properties: { island: "Bohol", v_nom: 69 } },
    { properties: { island: "Cebu", v_nom: 138 } },
    { properties: { voltage_kv: 230, island: "Leyte" } },
  ],
};

describe("filterFeatures", () => {
  it("returns empty for nullish input", () => {
    expect(filterFeatures(null, { islands: [], voltages: [] }).features).toEqual(
      [],
    );
  });

  it("filters by island", () => {
    const r = filterFeatures(fc, {
      islands: ["Cebu"],
      voltages: [230, 138, 69],
    });
    expect(r.features).toHaveLength(2);
    expect(r.features.every((f) => f.properties.island === "Cebu")).toBe(true);
  });

  it("filters by voltage, honouring v_nom or voltage_kv", () => {
    const r = filterFeatures(fc, {
      islands: ["Cebu", "Bohol", "Leyte"],
      voltages: [230],
    });
    expect(r.features).toHaveLength(2);
  });

  it("combines island and voltage filters", () => {
    const r = filterFeatures(fc, { islands: ["Cebu"], voltages: [230] });
    expect(r.features).toHaveLength(1);
    expect(r.features[0].properties.v_nom).toBe(230);
  });

  it("returns nothing when filters exclude everything", () => {
    expect(
      filterFeatures(fc, { islands: [], voltages: [230] }).features,
    ).toHaveLength(0);
  });
});
