"""
Reconcile the authoritative substation list with raw OSM data to produce
clean buses.csv and lines.csv for the prototype.

Usage:
    cd scripts && python process_raw.py

Inputs:
    ../data/raw/substations_authoritative.csv   user-provided ground truth (88 substations)
    ../data/raw/buses.csv                       OSM-extracted buses (substations + towers + distribution)
    ../data/raw/lines.csv                       OSM-extracted line segments

Outputs:
    ../data/buses.csv                           clean substation list, one row per authoritative substation
    ../data/lines.csv                           logical substation-to-substation interconnects

Strategy:
    1. Build canonical buses from the authoritative list.
    2. Match each OSM substation/cable-terminal to a canonical bus by:
       - exact normalized name match,
       - then proximity (within MATCH_RADIUS_KM).
    3. Drop OSM lines that are synthetic or below 60 kV.
    4. Build an undirected graph of OSM buses; collapse tower-only paths
       so each remaining edge connects two canonical substations.
    5. Aggregate path properties (sum length, max voltage, any submarine).
    6. Emit clean CSVs in the schema build_data.py expects.
"""

from __future__ import annotations

import math
import re
import sys
from collections import defaultdict
from pathlib import Path

import networkx as nx
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data"

AUTHORITATIVE_CSV = RAW_DIR / "substations_authoritative.csv"
RAW_BUSES = RAW_DIR / "buses.csv"
RAW_LINES = RAW_DIR / "lines.csv"
MANUAL_LINES = RAW_DIR / "manual_lines_supplement.csv"
LOAD_ESTIMATES = RAW_DIR / "load_estimates.csv"

OUT_BUSES = OUT_DIR / "buses.csv"
OUT_LINES = OUT_DIR / "lines.csv"

MATCH_RADIUS_KM = 12.0          # max distance for proximity-based matching
MAX_PATH_LENGTH_KM = 350.0      # reject zigzag/pathological collapsed paths
MIN_LINE_VOLTAGE_KV = 60        # drop sub-transmission / distribution lines
SLACK_BUS = "Ormoc"             # HVDC injection point

# Default impedances by voltage level (ACSR overhead, rough)
OVERHEAD_DEFAULTS = {
    230: dict(r=0.06, x=0.40, max_i_ka=0.95),
    138: dict(r=0.12, x=0.40, max_i_ka=0.65),
    69:  dict(r=0.30, x=0.40, max_i_ka=0.40),
}
SUBMARINE_DEFAULTS = dict(r=0.0754, x=0.121, max_i_ka=0.645)


# ---------- helpers ----------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


_STOPWORDS = re.compile(
    r"\b(substation|sub|sub-station|station|cable|terminal|les|ngcp|"
    r"switchyard|visayas|pusok|wright|pedc|ss|gen|bdpp|tap|i|ii)\b",
    re.I,
)

def normalize_name(s: str) -> str:
    s = str(s)
    s = re.sub(r"\([^)]*\)", " ", s)           # strip parentheticals
    s = _STOPWORDS.sub(" ", s)
    s = re.sub(r"[^A-Za-z0-9]", "", s).lower()
    return s


def parse_voltage_level(s: str) -> tuple[int | None, list[int], bool]:
    """'138/230 kV' -> (230, [138, 230], False); '69 kV (Gen)' -> (69, [69], True)."""
    is_gen = "gen" in s.lower()
    nums = sorted({int(n) for n in re.findall(r"\d+", s) if int(n) >= 30})
    return (max(nums) if nums else None), nums, is_gen


def closest_canonical(lat: float, lon: float, canonical: pd.DataFrame) -> tuple[int, float]:
    distances = canonical.apply(
        lambda r: haversine_km(lat, lon, r["y"], r["x"]), axis=1
    )
    idx = distances.idxmin()
    return idx, distances.loc[idx]


# ---------- pipeline ----------

def build_canonical_buses(auth_df: pd.DataFrame) -> pd.DataFrame:
    parsed = auth_df["Voltage_Level"].apply(parse_voltage_level)
    v_nom = [p[0] for p in parsed]
    voltages = [",".join(str(v) for v in p[1]) for p in parsed]
    bus_type = ["generator" if p[2] else "substation" for p in parsed]

    df = pd.DataFrame({
        "name": auth_df["Substation_Name"],
        "x": auth_df["Longitude_X"],
        "y": auth_df["Latitude_Y"],
        "v_nom": v_nom,
        "voltages_kv": voltages,
        "island": auth_df["Island"],
        "bus_type": bus_type,
        "p_mw": 0.0,
        "q_mvar": 0.0,
        "is_slack": False,
    })
    df.loc[df["name"] == SLACK_BUS, "is_slack"] = True
    if not df["is_slack"].any():
        sys.exit(f"Slack bus {SLACK_BUS!r} not found in authoritative list.")

    if LOAD_ESTIMATES.exists():
        loads = pd.read_csv(LOAD_ESTIMATES)
        load_map = {row["name"]: (row["p_mw"], row["q_mvar"]) for _, row in loads.iterrows()}
        applied = 0
        for i, row in df.iterrows():
            if row["name"] in load_map and row["bus_type"] != "generator":
                df.at[i, "p_mw"] = float(load_map[row["name"]][0])
                df.at[i, "q_mvar"] = float(load_map[row["name"]][1])
                applied += 1
        print(f"Applied load estimates to {applied} buses.")
    return df


def match_osm_to_canonical(raw_buses: pd.DataFrame, canonical: pd.DataFrame) -> dict[str, str]:
    """OSM bus_id -> canonical substation name."""
    name_to_idx: dict[str, int] = {}
    for i, row in canonical.iterrows():
        name_to_idx[normalize_name(row["name"])] = i

    is_sub = raw_buses["bus_type"].isin(["substation", "substation_synth"])
    candidates = raw_buses[is_sub].copy()

    mapping: dict[str, str] = {}
    unmatched_far: list[tuple[str, str, float]] = []
    for _, row in candidates.iterrows():
        osm_id = row["bus_id"]
        norm = normalize_name(row["name"])
        if norm in name_to_idx:
            mapping[osm_id] = canonical.iloc[name_to_idx[norm]]["name"]
            continue
        if pd.notna(row.get("v1_code")):
            stripped = re.sub(r"^\d+", "", str(row["v1_code"]))
            if normalize_name(stripped) in name_to_idx:
                mapping[osm_id] = canonical.iloc[name_to_idx[normalize_name(stripped)]]["name"]
                continue
        idx, dist = closest_canonical(row["lat"], row["lon"], canonical)
        if dist <= MATCH_RADIUS_KM:
            mapping[osm_id] = canonical.iloc[idx]["name"]
        else:
            unmatched_far.append((osm_id, str(row["name"]), dist))

    print(f"Matched {len(mapping)} OSM substations to {len(set(mapping.values()))} canonical buses.")
    if unmatched_far:
        print(f"Unmatched OSM substations (beyond {MATCH_RADIUS_KM} km): {len(unmatched_far)}")
        for osm_id, name, dist in unmatched_far[:10]:
            print(f"  - {osm_id} ({name}) — nearest canonical {dist:.1f} km away")
    return mapping


def build_osm_graph(raw_lines: pd.DataFrame) -> nx.Graph:
    G = nx.Graph()
    kept = 0
    for _, row in raw_lines.iterrows():
        if bool(row.get("is_synthetic", False)):
            continue
        v = row.get("voltage_kv")
        if pd.isna(v) or float(v) < MIN_LINE_VOLTAGE_KV:
            continue
        src, dst = row["from_bus"], row["to_bus"]
        if src == dst:
            continue
        length = float(row.get("length_km") or 0)
        existing = G.get_edge_data(src, dst)
        edge_props = dict(
            length_km=length,
            voltage_kv=float(v),
            is_submarine=bool(row.get("is_submarine", False)),
        )
        if existing is None or existing["length_km"] > length:
            G.add_edge(src, dst, **edge_props)
            kept += 1
    print(f"OSM graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges (kept {kept} segments).")
    return G


def collapse_paths(
    G: nx.Graph, osm_to_canonical: dict[str, str]
) -> list[dict]:
    """For each canonical pair, find the shortest tower-only path."""
    anchors = set(osm_to_canonical)
    pair_best: dict[tuple[str, str], dict] = {}

    for src in anchors:
        if src not in G:
            continue
        # BFS that allows traversal through non-anchor nodes only.
        # On reaching another anchor, record the path and stop expanding.
        # Track (distance, max_voltage, any_submarine) per node.
        best_dist: dict[str, float] = {src: 0.0}
        best_attr: dict[str, tuple[float, bool]] = {src: (0.0, False)}
        # Use simple Dijkstra-like expansion since edge weights are positive
        import heapq
        heap: list[tuple[float, str, float, bool]] = [(0.0, src, 0.0, False)]
        while heap:
            dist, node, vmax, sub = heapq.heappop(heap)
            if dist > best_dist.get(node, math.inf):
                continue
            if node != src and node in anchors:
                src_name = osm_to_canonical[src]
                dst_name = osm_to_canonical[node]
                if src_name == dst_name:
                    continue
                key = tuple(sorted([src_name, dst_name]))
                rec = {
                    "length_km": dist,
                    "voltage_kv": vmax,
                    "is_submarine": sub,
                }
                if key not in pair_best or pair_best[key]["length_km"] > dist:
                    pair_best[key] = rec
                continue  # do not traverse through other anchors
            for nbr, edata in G[node].items():
                new_dist = dist + edata["length_km"]
                new_vmax = max(vmax, edata["voltage_kv"])
                new_sub = sub or edata["is_submarine"]
                if new_dist < best_dist.get(nbr, math.inf):
                    best_dist[nbr] = new_dist
                    heapq.heappush(heap, (new_dist, nbr, new_vmax, new_sub))

    edges = []
    for (a, b), props in pair_best.items():
        if props["length_km"] > MAX_PATH_LENGTH_KM:
            continue
        edges.append({"from": a, "to": b, **props})
    return edges


def _line_row(from_bus: str, to_bus: str, voltage_kv: int, length_km: float,
              is_submarine: bool) -> dict:
    bucket = 230 if voltage_kv >= 200 else (138 if voltage_kv >= 100 else 69)
    if is_submarine:
        d = SUBMARINE_DEFAULTS
        cable_type = "submarine_xlpe"
    else:
        d = OVERHEAD_DEFAULTS.get(bucket, OVERHEAD_DEFAULTS[138])
        cable_type = "overhead"
    return {
        "line_id": f"L_{from_bus}_{to_bus}".replace(" ", "_").replace(".", ""),
        "from_bus": from_bus,
        "to_bus": to_bus,
        "voltage_kv": bucket,
        "length_km": round(length_km, 3),
        "r_ohm_per_km": d["r"],
        "x_ohm_per_km": d["x"],
        "max_i_ka": d["max_i_ka"],
        "is_submarine": is_submarine,
        "cable_type": cable_type,
    }


def lines_from_paths(paths: list[dict]) -> pd.DataFrame:
    rows = []
    for p in paths:
        v = int(round(p["voltage_kv"])) if p["voltage_kv"] else 138
        rows.append(_line_row(p["from"], p["to"], v, p["length_km"], p["is_submarine"]))
    return pd.DataFrame(rows)


def merge_supplement(derived: pd.DataFrame, valid_names: set[str]) -> pd.DataFrame:
    """Append manual supplement lines; supplement wins on duplicate (from,to) pairs."""
    if not MANUAL_LINES.exists():
        return derived
    sup = pd.read_csv(MANUAL_LINES)

    # Index existing by sorted pair
    by_pair: dict[tuple[str, str], dict] = {}
    for _, row in derived.iterrows():
        key = tuple(sorted([row["from_bus"], row["to_bus"]]))
        by_pair[key] = row.to_dict()

    added = 0
    overridden = 0
    skipped = 0
    for _, row in sup.iterrows():
        a, b = row["from_bus"], row["to_bus"]
        if a not in valid_names or b not in valid_names:
            print(f"  supplement skipped (unknown bus): {a} -> {b}")
            skipped += 1
            continue
        key = tuple(sorted([a, b]))
        rec = _line_row(a, b, int(row["voltage_kv"]), float(row["length_km"]),
                        bool(row["is_submarine"]))
        if key in by_pair:
            overridden += 1
        else:
            added += 1
        by_pair[key] = rec

    print(f"Supplement: added {added}, overrode {overridden}, skipped {skipped}.")
    return pd.DataFrame(list(by_pair.values()))


def main() -> None:
    if not AUTHORITATIVE_CSV.exists():
        sys.exit(f"Missing: {AUTHORITATIVE_CSV}")
    auth_df = pd.read_csv(AUTHORITATIVE_CSV)
    raw_buses = pd.read_csv(RAW_BUSES)
    raw_lines = pd.read_csv(RAW_LINES)

    canonical = build_canonical_buses(auth_df)
    print(f"Canonical buses: {len(canonical)}")

    osm_to_canonical = match_osm_to_canonical(raw_buses, canonical)
    G = build_osm_graph(raw_lines)
    paths = collapse_paths(G, osm_to_canonical)
    lines_df = lines_from_paths(paths)
    lines_df = merge_supplement(lines_df, set(canonical["name"]))

    print(f"Total lines: {len(lines_df)}")
    print(lines_df.groupby("voltage_kv").size().rename("count"))
    print(f"Submarine lines: {int(lines_df['is_submarine'].sum())}")

    # Sanity: which canonical buses ended up with zero connections?
    referenced = set(lines_df["from_bus"]) | set(lines_df["to_bus"])
    orphaned = sorted(set(canonical["name"]) - referenced)
    if orphaned:
        print(f"\nCanonical buses with NO derived lines ({len(orphaned)}):")
        for n in orphaned:
            print(f"  - {n}")
        print("(These will need manual line entries or are isolated by gaps in OSM coverage.)")

    canonical.to_csv(OUT_BUSES, index=False)
    lines_df.to_csv(OUT_LINES, index=False)
    print(f"\nWrote {OUT_BUSES}")
    print(f"Wrote {OUT_LINES}")


if __name__ == "__main__":
    main()
