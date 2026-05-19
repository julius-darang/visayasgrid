import { ISLANDS, VOLTAGE_LEVELS } from "./styles.js";

// Pure encode/decode for the shareable view state carried in the URL
// hash. Kept separate from React so it can be unit-tested.

export function parseViewState(hash) {
  const p = new URLSearchParams(String(hash || "").replace(/^#/, ""));

  let islands = ISLANDS;
  const i = p.get("islands");
  if (i) {
    const picked = ISLANDS.filter((x) => i.split(",").includes(x));
    if (picked.length) islands = picked;
  }

  let voltages = VOLTAGE_LEVELS;
  const kv = p.get("kv");
  if (kv) {
    const picked = kv
      .split(",")
      .map(Number)
      .filter((n) => VOLTAGE_LEVELS.includes(n));
    if (picked.length) voltages = picked;
  }

  return { islands, voltages, sel: p.get("sel") };
}

export function encodeViewState({ islands, voltages, selected }) {
  const p = new URLSearchParams();
  if (islands && islands.length !== ISLANDS.length) {
    p.set("islands", islands.join(","));
  }
  if (voltages && voltages.length !== VOLTAGE_LEVELS.length) {
    p.set("kv", voltages.join(","));
  }
  if (selected) {
    const pr = selected.feature.properties;
    p.set(
      "sel",
      selected.kind === "bus"
        ? `bus:${pr.name}`
        : `line:${pr.from_bus}|${pr.to_bus}`,
    );
  }
  return p.toString();
}

export function parseSel(sel) {
  if (!sel) return null;
  if (sel.startsWith("bus:")) return { kind: "bus", name: sel.slice(4) };
  if (sel.startsWith("line:")) {
    const [from, to] = sel.slice(5).split("|");
    return { kind: "line", from, to };
  }
  return null;
}
