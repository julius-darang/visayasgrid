"""
Build clean buses.csv and lines.csv directly from the NGCP-coded dataset in
data/temp/. Temporary path while the temp dataset is the authoritative source
of coordinates and electrical parameters.

Skips the OSM derivation pipeline (process_raw.py) entirely.

Usage:
    .venv/bin/python scripts/process_temp.py
"""

from __future__ import annotations

import math
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
TEMP_BUSES = ROOT / "data" / "temp" / "buses.csv"
TEMP_LINES = ROOT / "data" / "temp" / "lines.csv"
TEMP_GENERATORS = ROOT / "data" / "temp" / "generators.csv"
TEMP_LOADS = ROOT / "data" / "temp" / "loads.csv"
LOAD_ESTIMATES = ROOT / "data" / "load_estimates.csv"

# Each feeder attachment in loads.csv has no MW values; we assign a default
# per attachment so that the sum across Visayas (~140 feeders × 12) approximates
# the ~2 GW Visayas peak demand. q_mvar is derived from a typical 0.96 PF.
LOAD_MW_PER_FEEDER = 12.0
LOAD_PF_QP_RATIO = 0.30

OUT_BUSES = ROOT / "data" / "buses.csv"
OUT_LINES = ROOT / "data" / "lines.csv"
OUT_GENERATORS = ROOT / "data" / "generators.csv"

# Capacity factors by generation technology — applied to p_nom to estimate
# typical operating output for a snapshot DC load flow.
DISPATCH_FACTOR = {
    "Coal":       0.80,
    "Geothermal": 0.85,
    "Biomass":    0.70,
    "Hydro":      0.50,
    "ROR":        0.40,
    "Solar":      0.25,
    "Wind":       0.30,
    "Diesel":     0.30,
}

VISAYAS_PREFIXES = {"04", "05", "06", "07", "08"}
SLACK_BUS = "Ormoc"

# Merge duplicate NGCP nodes into one canonical bus (same physical facility).
MERGE_CODES = {"04STARITATAP": "04STARITA"}

# Drop these (distribution/internal nodes, no useful coordinates).
DROP_CODES: set[str] = set()

# Pairs known to be submarine cables. Anything else is overhead — this avoids
# the false positive on Leyte↔Samar (San Juanico Bridge is overhead).
SUBMARINE_PAIRS = {
    frozenset({"05MAGDUGO", "06CALATRAVA"}),  # Cebu-Negros 230 kV
    frozenset({"05SAMBOAN", "06AMLAN"}),       # Cebu-Negros 138 kV
    frozenset({"05DAANBNTAY", "04TABANGO"}),   # Cebu-Leyte 230 kV
    frozenset({"05DUMANJUG", "07CORELLA"}),    # Cebu-Bohol
    frozenset({"04MAASIN", "07UBAY"}),         # Leyte-Bohol
    frozenset({"06GAHIT", "08STBARBRA"}),      # Negros-Panay
    frozenset({"08BANTAP", "08BVISTA"}),       # Panay-Guimaras
}

# NGCP v1_code → (readable_name, island, bus_type).
CODE_INFO: dict[str, tuple[str, str, str]] = {
    "04ORMOC":      ("Ormoc",             "Leyte",    "hvdc"),
    "04BABATNGN":   ("Babatngon",         "Leyte",    "substation"),
    "04MAASIN":     ("Maasin",            "Leyte",    "substation"),
    "04TABANGO":    ("Tabango",           "Leyte",    "substation"),
    "04ISABEL":     ("Isabel",            "Leyte",    "substation"),
    "04KANANGA":    ("Kananga",           "Leyte",    "substation"),
    "04TONGONA":    ("Tongonan",          "Leyte",    "generator"),
    "04CALBAYOG":   ("Calbayog",          "Samar",    "substation"),
    "04PARANAS":    ("Paranas (Wright)",  "Samar",    "substation"),
    "04STARITA":    ("Sta. Rita",         "Samar",    "substation"),
    "05CEBU":       ("Cebu",              "Cebu",     "substation"),
    "05MANDAUE":    ("Mandaue",           "Cebu",     "substation"),
    "05LAPULAPU":   ("Lapu-Lapu (Pusok)", "Cebu",     "substation"),
    "05MAGDUGO":    ("Magdugo",           "Cebu",     "substation"),
    "05DAANBNTAY":  ("Daanbantayan",      "Cebu",     "substation"),
    "05DAANLUNSOD": ("Daan Lungsod",      "Cebu",     "substation"),
    "05COMPSTLA":   ("Compostela",        "Cebu",     "substation"),
    "05COLON":      ("Colon",             "Cebu",     "substation"),
    "05TOLEDO":     ("Toledo",            "Cebu",     "substation"),
    "05TOLBESS":    ("Toledo BESS",       "Cebu",     "bess"),
    "05CALUNG":     ("Calong-calong",     "Cebu",     "substation"),
    "05NAGA":       ("Naga (Visayas)",    "Cebu",     "substation"),
    "05QUIOT":      ("Quiot",             "Cebu",     "substation"),
    "05SAMBOAN":    ("Samboan",           "Cebu",     "substation"),
    "05DUMANJUG":   ("Dumanjug",          "Cebu",     "substation"),
    "05KSPC":       ("KSPC",              "Cebu",     "generator"),
    "05THERMA":     ("Therma Visayas",    "Cebu",     "generator"),
    "06BACOLOD":    ("Bacolod",           "Negros",   "substation"),
    "06CADIZ":      ("Cadiz",             "Negros",   "substation"),
    "06AMLAN":      ("Amlan",             "Negros",   "substation"),
    "06MABINAY":    ("Mabinay",           "Negros",   "substation"),
    "06KABANKALAN": ("Kabankalan",        "Negros",   "substation"),
    "06KBANBESS":   ("Kabankalan BESS",   "Negros",   "bess"),
    "06SNCARLOS":   ("San Carlos",        "Negros",   "substation"),
    "06CALATRAVA":  ("Calatrava",         "Negros",   "substation"),
    "06HELIOS":     ("Helios Solar",      "Negros",   "generator"),
    "06GAHIT":      ("E.B. Magalona",     "Negros",   "substation"),
    "06PGPP1":      ("Palinpinon 1",      "Negros",   "generator"),
    "06PGPP2":      ("Palinpinon 2",      "Negros",   "generator"),
    "07CORELLA":    ("Corella",           "Bohol",    "substation"),
    "07UBAY":       ("Ubay",              "Bohol",    "substation"),
    "07TAPAL":      ("Tapal",             "Bohol",    "substation"),
    "08BAROTAC":    ("Barotac Viejo",     "Panay",    "substation"),
    "08PANITAN":    ("Panitan",           "Panay",    "substation"),
    "08DINGLE":     ("Dingle",            "Panay",    "substation"),
    "08STBARBRA":   ("Sta. Barbara",      "Panay",    "substation"),
    "08SNJOSE":     ("San Jose",          "Panay",    "substation"),
    "08ILOILO1":    ("Iloilo (PEDC)",     "Panay",    "substation"),
    "08CONCEPCION": ("Concepcion",        "Panay",    "substation"),
    "08NABAS":      ("Nabas",             "Panay",    "substation"),
    "08BANTAP":     ("Bantap",            "Panay",    "substation"),
    "08BVISTA":     ("Buenavista (Guimaras)", "Guimaras", "substation"),
}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(a))


def line_voltage_from_name(name: str, default: int = 138) -> int:
    try:
        v = int(str(name).split("_")[0])
        return v if v >= 30 else default
    except (ValueError, IndexError):
        return default


def main() -> None:
    buses_raw = pd.read_csv(TEMP_BUSES)
    lines_raw = pd.read_csv(TEMP_LINES)

    is_visayas = buses_raw["name"].str[:2].isin(VISAYAS_PREFIXES)
    visayas_buses = buses_raw[is_visayas].copy()
    visayas_buses = visayas_buses[~visayas_buses["name"].isin(DROP_CODES)]
    visayas_buses = visayas_buses[~visayas_buses["name"].isin(MERGE_CODES)]
    print(f"Visayas buses (after merge/drop): {len(visayas_buses)}")

    # Build readable bus list
    code_to_name: dict[str, str] = {}
    code_to_island: dict[str, str] = {}
    bus_rows = []
    for _, row in visayas_buses.iterrows():
        code = row["name"]
        readable, island, btype = CODE_INFO.get(
            code, (code, "Visayas", "substation")
        )
        code_to_name[code] = readable
        code_to_island[code] = island
        bus_rows.append({
            "name": readable,
            "code": code,
            "x": float(row["x"]),
            "y": float(row["y"]),
            "v_nom": int(row["v_nom"]),
            "voltages_kv": int(row["v_nom"]),
            "island": island,
            "bus_type": btype,
            "p_mw": 0.0,
            "q_mvar": 0.0,
            "is_slack": False,
        })
    buses_df = pd.DataFrame(bus_rows)

    # Aliases for merged codes (e.g. 04STARITATAP → 04STARITA)
    for src, dst in MERGE_CODES.items():
        if dst in code_to_name:
            code_to_name[src] = code_to_name[dst]
            code_to_island[src] = code_to_island[dst]

    # Slack
    buses_df.loc[buses_df["name"] == SLACK_BUS, "is_slack"] = True
    if not buses_df["is_slack"].any():
        raise SystemExit(f"Slack bus {SLACK_BUS!r} not present in temp data.")

    # Loads — primary source is data/temp/loads.csv (feeder attachments per bus).
    # Each attachment is assigned a default MW; total calibrated to ~2 GW Visayas peak.
    buses_df["load_count"] = 0
    if TEMP_LOADS.exists():
        load_rows = pd.read_csv(TEMP_LOADS)
        vis = load_rows[load_rows["bus"].str[:2].isin(VISAYAS_PREFIXES)].copy()
        vis["bus_canonical"] = vis["bus"].apply(lambda b: MERGE_CODES.get(b, b))
        vis = vis[vis["bus_canonical"].isin(code_to_name)]
        counts = vis.groupby("bus_canonical").size()
        for i, row in buses_df.iterrows():
            code = row["code"]
            if code in counts.index:
                n = int(counts[code])
                buses_df.at[i, "load_count"] = n
                buses_df.at[i, "p_mw"] = round(n * LOAD_MW_PER_FEEDER, 1)
                buses_df.at[i, "q_mvar"] = round(n * LOAD_MW_PER_FEEDER * LOAD_PF_QP_RATIO, 1)
        total = buses_df["p_mw"].sum()
        n_buses = int((buses_df["load_count"] > 0).sum())
        print(f"Loads: {len(vis)} feeders across {n_buses} buses, "
              f"~{total:.0f} MW estimated demand (from temp/loads.csv).")

    # load_estimates.csv is kept around as an optional hand-tuned override,
    # but only fills GAPS — i.e., applies to buses that have no entry in
    # temp/loads.csv. This avoids the override silently undercutting the
    # data-driven counts.
    if LOAD_ESTIMATES.exists():
        est = pd.read_csv(LOAD_ESTIMATES)
        load_map = {r["name"]: (float(r["p_mw"]), float(r["q_mvar"])) for _, r in est.iterrows()}
        gap_fills = 0
        for i, row in buses_df.iterrows():
            if (row["name"] in load_map
                and row["load_count"] == 0
                and row["bus_type"] not in ("generator", "bess")):
                buses_df.at[i, "p_mw"] = load_map[row["name"]][0]
                buses_df.at[i, "q_mvar"] = load_map[row["name"]][1]
                gap_fills += 1
        print(f"Filled {gap_fills} load gaps from load_estimates.csv (buses without feeder data).")

    # Generators
    buses_df["gen_capacity_mw"] = 0.0
    buses_df["gen_mw"] = 0.0
    buses_df["gen_carriers"] = ""
    if TEMP_GENERATORS.exists():
        gens = pd.read_csv(TEMP_GENERATORS)
        visayas_gens = gens[gens["bus"].str[:2].isin(VISAYAS_PREFIXES)].copy()
        visayas_gens["bus_canonical"] = visayas_gens["bus"].apply(
            lambda b: MERGE_CODES.get(b, b)
        )
        visayas_gens = visayas_gens[visayas_gens["bus_canonical"].isin(code_to_name)]
        visayas_gens["dispatch_mw"] = visayas_gens.apply(
            lambda r: float(r["p_nom"]) * DISPATCH_FACTOR.get(r["carrier"], 0.5),
            axis=1,
        )
        visayas_gens["substation"] = visayas_gens["bus_canonical"].map(code_to_name)

        total_pnom = visayas_gens["p_nom"].sum()
        total_disp = visayas_gens["dispatch_mw"].sum()
        print(f"Visayas generators: {len(visayas_gens)} units, "
              f"{total_pnom:.0f} MW installed, {total_disp:.0f} MW dispatched.")

        by_bus = visayas_gens.groupby("substation").agg(
            p_nom_total=("p_nom", "sum"),
            dispatch_total=("dispatch_mw", "sum"),
            carriers=("carrier", lambda c: ",".join(sorted(set(c)))),
        ).to_dict("index")
        # Primary carrier = the one contributing the most installed capacity at this bus.
        primary = (
            visayas_gens.groupby(["substation", "carrier"])["p_nom"].sum()
            .reset_index().sort_values("p_nom", ascending=False)
            .drop_duplicates("substation").set_index("substation")["carrier"].to_dict()
        )
        buses_df["primary_carrier"] = ""
        for i, row in buses_df.iterrows():
            if row["name"] in by_bus:
                d = by_bus[row["name"]]
                buses_df.at[i, "gen_capacity_mw"] = round(d["p_nom_total"], 2)
                buses_df.at[i, "gen_mw"] = round(d["dispatch_total"], 2)
                buses_df.at[i, "gen_carriers"] = d["carriers"]
                buses_df.at[i, "primary_carrier"] = primary.get(row["name"], "")

        gen_out = visayas_gens[["name", "substation", "p_nom", "carrier",
                                 "build_year", "dispatch_mw"]].copy()
        gen_out.columns = ["generator_id", "substation", "p_nom_mw", "carrier",
                            "build_year", "dispatch_mw"]
        gen_out["dispatch_mw"] = gen_out["dispatch_mw"].round(2)
        gen_out.to_csv(OUT_GENERATORS, index=False)
        print(f"Wrote {OUT_GENERATORS} ({len(gen_out)} generators).")

    # Filter lines to Visayas (both endpoints known after merge)
    def resolve(code: str) -> str | None:
        return code_to_name.get(MERGE_CODES.get(code, code))

    line_rows = []
    seen_pairs: dict[tuple[str, str], dict] = {}
    bus_xy = {r["code"]: (r["y"], r["x"]) for _, r in buses_df.iterrows()}
    bus_xy.update({src: bus_xy[dst] for src, dst in MERGE_CODES.items() if dst in bus_xy})

    for _, row in lines_raw.iterrows():
        bus0 = MERGE_CODES.get(row["bus0"], row["bus0"])
        bus1 = MERGE_CODES.get(row["bus1"], row["bus1"])
        if bus0 == bus1:
            continue
        if bus0[:2] not in VISAYAS_PREFIXES or bus1[:2] not in VISAYAS_PREFIXES:
            continue
        name_from = resolve(bus0)
        name_to = resolve(bus1)
        if not name_from or not name_to:
            continue

        v_line = line_voltage_from_name(row["name"])
        if v_line < 30:
            continue  # drop distribution

        lat0, lon0 = bus_xy[bus0]
        lat1, lon1 = bus_xy[bus1]
        length_km = max(haversine_km(lat0, lon0, lat1, lon1), 0.5)

        cables = max(int(row["cables"]), 1)
        s_nom_mva = float(row["s_nom"])
        r_total = float(row["r"])
        x_total = float(row["x"])
        max_i_ka = s_nom_mva / (math.sqrt(3) * v_line)
        is_submarine = frozenset({bus0, bus1}) in SUBMARINE_PAIRS

        rec = {
            "line_id": f"L_{name_from}_{name_to}_{v_line}"
                        .replace(" ", "_").replace(".", "")
                        .replace("(", "").replace(")", ""),
            "from_bus": name_from,
            "to_bus": name_to,
            "voltage_kv": v_line,
            "length_km": round(length_km, 3),
            "r_ohm_per_km": round(r_total / length_km, 6),
            "x_ohm_per_km": round(x_total / length_km, 6),
            "max_i_ka": round(max_i_ka, 4),
            "is_submarine": is_submarine,
            "cable_type": "submarine_xlpe" if is_submarine else "overhead",
            "parallel": cables,
        }
        key = (tuple(sorted([name_from, name_to])), v_line)
        if key not in seen_pairs:
            seen_pairs[key] = rec
        else:
            # Merge into existing parallel
            seen_pairs[key]["parallel"] += cables

    line_rows = list(seen_pairs.values())
    lines_df = pd.DataFrame(line_rows)
    print(f"Total lines: {len(lines_df)}")
    if not lines_df.empty:
        print(lines_df.groupby("voltage_kv").size().rename("count"))
        print(f"Submarine lines: {int(lines_df['is_submarine'].sum())}")

    referenced = set(lines_df["from_bus"]) | set(lines_df["to_bus"])
    orphans = sorted(set(buses_df["name"]) - referenced)
    if orphans:
        print(f"Orphan buses (no lines): {len(orphans)}")
        for n in orphans:
            print(f"  - {n}")

    buses_out = buses_df.drop(columns=["code"])
    buses_out.to_csv(OUT_BUSES, index=False)
    lines_df.to_csv(OUT_LINES, index=False)
    print(f"\nWrote {OUT_BUSES} ({len(buses_out)} buses)")
    print(f"Wrote {OUT_LINES} ({len(lines_df)} lines)")


if __name__ == "__main__":
    main()
