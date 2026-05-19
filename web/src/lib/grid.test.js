import { describe, it, expect } from "vitest";
import { overloadedLines, voltageViolations, featureCenter } from "./grid.js";

const lineFC = {
  features: [
    { properties: { loading_percent: 40 } },
    { properties: { loading_percent: 130 } },
    { properties: { loading_percent: 105 } },
    { properties: { loading_percent: null } },
  ],
};

const busFC = {
  features: [
    { properties: { vm_pu: 1.0 } },
    { properties: { vm_pu: 0.9 } },
    { properties: { vm_pu: 1.08 } },
    { properties: { vm_pu: null } },
  ],
};

describe("overloadedLines", () => {
  it("keeps only >100% and sorts worst first", () => {
    const r = overloadedLines(lineFC);
    expect(r.map((f) => f.properties.loading_percent)).toEqual([130, 105]);
  });
  it("is safe on missing input", () => {
    expect(overloadedLines(null)).toEqual([]);
  });
});

describe("voltageViolations", () => {
  it("keeps buses outside 0.95–1.05, worst deviation first", () => {
    const r = voltageViolations(busFC);
    expect(r.map((f) => f.properties.vm_pu)).toEqual([0.9, 1.08]);
  });
  it("ignores null vm_pu and missing input", () => {
    expect(voltageViolations({ features: [{ properties: { vm_pu: null } }] }))
      .toEqual([]);
    expect(voltageViolations(undefined)).toEqual([]);
  });
});

describe("featureCenter", () => {
  it("returns the point coordinate for a Point", () => {
    expect(featureCenter({ type: "Point", coordinates: [123, 10] })).toEqual({
      lng: 123,
      lat: 10,
    });
  });
  it("returns a mid vertex for a LineString", () => {
    expect(
      featureCenter({
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
          [4, 4],
        ],
      }),
    ).toEqual({ lng: 2, lat: 2 });
  });
});
