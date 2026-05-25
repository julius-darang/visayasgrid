import { describe, it, expect } from "vitest";
import {
  colorForLoading,
  colorForVoltage,
  colorForVoltagePu,
  radiusForBus,
  LOADING_SCALE,
  VOLTAGE_COLORS,
} from "./styles.js";

describe("colorForLoading", () => {
  it("returns the unknown colour for null", () => {
    expect(colorForLoading(null)).toBe("#94a3b8");
  });
  it("maps each band to the shared scale colours", () => {
    expect(colorForLoading(10)).toBe(LOADING_SCALE[0].color); // < 50
    expect(colorForLoading(65)).toBe(LOADING_SCALE[1].color); // 50–80
    expect(colorForLoading(90)).toBe(LOADING_SCALE[2].color); // 80–100
    expect(colorForLoading(140)).toBe(LOADING_SCALE[3].color); // > 100
  });
  it("treats exactly 100% as the high (not over) band", () => {
    expect(colorForLoading(100)).toBe(LOADING_SCALE[2].color);
  });
});

describe("colorForVoltage", () => {
  it("uses the per-level palette and a fallback", () => {
    expect(colorForVoltage(230)).toBe(VOLTAGE_COLORS[230]);
    expect(colorForVoltage(999)).toBe("#888");
  });
});

describe("colorForVoltagePu", () => {
  it("flags violations outside 0.95–1.05", () => {
    expect(colorForVoltagePu(0.9)).toBe("#9b2226");
    expect(colorForVoltagePu(1.2)).toBe("#9b2226");
  });
  it("flags caution between 3–5% deviation", () => {
    expect(colorForVoltagePu(0.96)).toBe("#f4a261");
    expect(colorForVoltagePu(1.04)).toBe("#f4a261");
  });
  it("treats near-nominal as healthy and null as unknown", () => {
    expect(colorForVoltagePu(1.0)).toBe("#2d6a4f");
    expect(colorForVoltagePu(null)).toBe("#94a3b8");
  });
});

describe("radiusForBus", () => {
  it("scales base radius by nominal voltage", () => {
    expect(radiusForBus({ v_nom: 230 })).toBe(4.5);
    expect(radiusForBus({ v_nom: 69 })).toBe(3);
  });
  it("adds a bounded bump for generation capacity", () => {
    const plain = radiusForBus({ v_nom: 230 });
    const withGen = radiusForBus({ v_nom: 230, gen_capacity_mw: 1000 });
    expect(withGen).toBeGreaterThan(plain);
    expect(withGen).toBeLessThanOrEqual(plain + 4);
  });
});
