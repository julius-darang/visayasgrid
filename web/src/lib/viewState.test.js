import { describe, it, expect } from "vitest";
import { parseViewState, encodeViewState, parseSel } from "./viewState.js";
import { ISLANDS, VOLTAGE_LEVELS } from "./styles.js";

describe("parseViewState", () => {
  it("defaults to all islands/voltages with an empty hash", () => {
    const s = parseViewState("");
    expect(s.islands).toEqual(ISLANDS);
    expect(s.voltages).toEqual(VOLTAGE_LEVELS);
    expect(s.sel).toBe(null);
  });
  it("parses a subset and ignores unknown tokens", () => {
    const s = parseViewState("#islands=Cebu,Bogus&kv=230,69,42&sel=bus:Cebu");
    expect(s.islands).toEqual(["Cebu"]);
    expect(s.voltages).toEqual([230, 69]);
    expect(s.sel).toBe("bus:Cebu");
  });
  it("falls back to all when nothing valid is provided", () => {
    const s = parseViewState("#islands=Nope&kv=1");
    expect(s.islands).toEqual(ISLANDS);
    expect(s.voltages).toEqual(VOLTAGE_LEVELS);
  });
});

describe("encodeViewState", () => {
  it("omits filters when everything is selected", () => {
    expect(
      encodeViewState({
        islands: ISLANDS,
        voltages: VOLTAGE_LEVELS,
        selected: null,
      }),
    ).toBe("");
  });
  it("round-trips a partial selection", () => {
    const qs = encodeViewState({
      islands: ["Cebu", "Bohol"],
      voltages: [230],
      selected: { kind: "bus", feature: { properties: { name: "Cebu" } } },
    });
    const back = parseViewState("#" + qs);
    expect(back.islands).toEqual(["Cebu", "Bohol"]);
    expect(back.voltages).toEqual([230]);
    expect(back.sel).toBe("bus:Cebu");
  });
  it("encodes a line selection by endpoints", () => {
    const qs = encodeViewState({
      islands: ISLANDS,
      voltages: VOLTAGE_LEVELS,
      selected: {
        kind: "line",
        feature: { properties: { from_bus: "A", to_bus: "B" } },
      },
    });
    expect(qs).toBe("sel=line%3AA%7CB");
  });
});

describe("parseSel", () => {
  it("decodes bus and line selectors", () => {
    expect(parseSel("bus:Ormoc")).toEqual({ kind: "bus", name: "Ormoc" });
    expect(parseSel("line:A|B")).toEqual({ kind: "line", from: "A", to: "B" });
  });
  it("returns null for empty or malformed input", () => {
    expect(parseSel(null)).toBe(null);
    expect(parseSel("weird")).toBe(null);
  });
});
