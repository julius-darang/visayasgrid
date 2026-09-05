import { describe, it, expect } from "vitest";
import { filterFeatures, filterLines } from "./useGridData.js";

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

describe("filterLines", () => {
  const buses = {
    type: "FeatureCollection",
    features: [
      { properties: { name: "Cebu A", island: "Cebu" } },
      { properties: { name: "Cebu B", island: "Cebu" } },
      { properties: { name: "Bohol A", island: "Bohol" } },
      { properties: { name: "Leyte A", island: "Leyte" } },
    ],
  };
  const lines = {
    type: "FeatureCollection",
    features: [
      { properties: { from_bus: "Cebu A", to_bus: "Cebu B", voltage_kv: 230 } },
      { properties: { from_bus: "Cebu A", to_bus: "Bohol A", voltage_kv: 230 } },
      { properties: { from_bus: "Bohol A", to_bus: "Leyte A", voltage_kv: 138 } },
    ],
  };

  it("keeps a line when either endpoint is on a selected island", () => {
    const result = filterLines(lines, buses, {
      islands: ["Cebu"],
      voltages: [230, 138],
    });
    expect(result.features).toHaveLength(2);
  });

  it("removes all lines when no islands are selected", () => {
    const result = filterLines(lines, buses, {
      islands: [],
      voltages: [230, 138],
    });
    expect(result.features).toEqual([]);
  });

  it("still applies the voltage filter", () => {
    const result = filterLines(lines, buses, {
      islands: ["Cebu"],
      voltages: [138],
    });
    expect(result.features).toEqual([]);
  });
});
