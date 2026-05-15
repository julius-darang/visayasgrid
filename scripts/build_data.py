"""
Build the Visayas transmission network from the clean CSVs, run a load flow
on the connected portion, and emit GeoJSON files consumed by the frontend.

Usage:
    .venv/bin/python scripts/build_data.py

Inputs:
    data/buses.csv     produced by process_temp.py
    data/lines.csv     produced by process_temp.py

Outputs:
    web/public/data/buses.geojson
    web/public/data/lines.geojson
    web/public/data/manifest.json

Behavior:
    - Buses not reachable from the slack are kept in the GeoJSON (for the map)
      but excluded from the load flow.
    - If no loads are defined (sum p_mw == 0), the load flow is skipped and
      buses/lines are emitted with null result fields.
    - DC load flow is used (rundcpp). AC (runpp) requires explicit transformer
      models between the mixed-voltage buses in this network; deferred.
    - After DC flow, HVDC import at Ormoc is captured from ext_grid results and
      stored on the Ormoc bus feature and in manifest.json.
"""

from __future__ import annotations

import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pandapower as pp
import pandapower.topology as top

from constants import HVDC_CAPACITY_MW

ROOT = Path(__file__).resolve().parent.parent
BUSES_CSV = ROOT / "data" / "buses.csv"
LINES_CSV = ROOT / "data" / "lines.csv"
OUTPUT_DIR = ROOT / "web" / "public" / "data"


def load_inputs() -> tuple[pd.DataFrame, pd.DataFrame]:
    if not BUSES_CSV.exists() or not LINES_CSV.exists():
        sys.exit(
            "Missing input CSVs. Run scripts/process_temp.py first to "
            "generate data/buses.csv and data/lines.csv."
        )
    return pd.read_csv(BUSES_CSV), pd.read_csv(LINES_CSV)


def build_network(buses_df: pd.DataFrame, lines_df: pd.DataFrame):
    net = pp.create_empty_network(f_hz=60)
    bus_idx: dict[str, int] = {}

    for _, row in buses_df.iterrows():
        idx = pp.create_bus(
            net,
            vn_kv=float(row["v_nom"]),
            name=row["name"],
            geodata=(float(row["y"]), float(row["x"])),
        )
        bus_idx[row["name"]] = idx

    slack = buses_df.loc[buses_df["is_slack"].astype(bool), "name"]
    if slack.empty:
        sys.exit("No slack bus in buses.csv (is_slack=True).")
    pp.create_ext_grid(net, bus=bus_idx[slack.iloc[0]], vm_pu=1.0)

    if "p_mw" in buses_df.columns:
        for _, row in buses_df.iterrows():
            p = float(row.get("p_mw") or 0)
            q = float(row.get("q_mvar") or 0)
            if p or q:
                pp.create_load(net, bus=bus_idx[row["name"]], p_mw=p, q_mvar=q)

    if "gen_mw" in buses_df.columns:
        for _, row in buses_df.iterrows():
            g = float(row.get("gen_mw") or 0)
            if g > 0:
                pp.create_sgen(net, bus=bus_idx[row["name"]], p_mw=g, q_mvar=0,
                               name=f"{row['name']}_gen")

    missing = []
    has_parallel = "parallel" in lines_df.columns
    has_c = "c_nf_per_km" in lines_df.columns
    for _, row in lines_df.iterrows():
        if row["from_bus"] not in bus_idx or row["to_bus"] not in bus_idx:
            missing.append(row["line_id"])
            continue
        parallel = int(row["parallel"]) if has_parallel and pd.notna(row["parallel"]) else 1
        c_nf = float(row["c_nf_per_km"]) if has_c and pd.notna(row.get("c_nf_per_km")) else 0.0
        pp.create_line_from_parameters(
            net,
            from_bus=bus_idx[row["from_bus"]],
            to_bus=bus_idx[row["to_bus"]],
            length_km=float(row["length_km"]),
            r_ohm_per_km=float(row["r_ohm_per_km"]),
            x_ohm_per_km=float(row["x_ohm_per_km"]),
            c_nf_per_km=c_nf,
            max_i_ka=float(row["max_i_ka"]),
            parallel=parallel,
            name=row["line_id"],
        )
    if missing:
        print(f"WARNING: {len(missing)} lines reference unknown buses (skipped).")
    return net, bus_idx


def _clean(v):
    if isinstance(v, float) and pd.isna(v):
        return None
    return v


def emit_geojson(
    buses_df: pd.DataFrame,
    lines_df: pd.DataFrame,
    net,
    has_results: bool,
    connected_buses: set[str],
    hvdc_import_mw: float | None = None,
    power_flow_mode: str = "none",
) -> None:
    bus_features = []
    for _, row in buses_df.iterrows():
        props = {k: _clean(v) for k, v in row.to_dict().items()}
        props["connected"] = row["name"] in connected_buses
        props["vm_pu"] = None
        props["va_degree"] = None
        if has_results and row["name"] in connected_buses:
            try:
                idx = net.bus.index[net.bus["name"] == row["name"]][0]
                props["vm_pu"] = float(net.res_bus.at[idx, "vm_pu"])
                props["va_degree"] = float(net.res_bus.at[idx, "va_degree"])
            except (KeyError, IndexError):
                pass
        # Attach HVDC import MW to the slack/HVDC bus for frontend display.
        if props.get("bus_type") == "hvdc":
            props["hvdc_import_mw"] = (
                round(hvdc_import_mw, 1) if hvdc_import_mw is not None else None
            )
        bus_features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(row["x"]), float(row["y"])]},
            "properties": props,
        })

    by_name = buses_df.set_index("name")
    line_features = []
    for _, row in lines_df.iterrows():
        if row["from_bus"] not in by_name.index or row["to_bus"] not in by_name.index:
            continue
        a = by_name.loc[row["from_bus"]]
        b = by_name.loc[row["to_bus"]]
        props = {k: _clean(v) for k, v in row.to_dict().items()}
        props["loading_percent"] = None
        props["p_from_mw"] = None
        props["i_from_ka"] = None
        if has_results:
            try:
                idx = net.line.index[net.line["name"] == row["line_id"]][0]
                props["loading_percent"] = float(net.res_line.at[idx, "loading_percent"])
                props["p_from_mw"] = float(net.res_line.at[idx, "p_from_mw"])
                props["i_from_ka"] = float(net.res_line.at[idx, "i_from_ka"])
            except (KeyError, IndexError):
                pass
        line_features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [float(a["x"]), float(a["y"])],
                    [float(b["x"]), float(b["y"])],
                ],
            },
            "properties": props,
        })

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUTPUT_DIR / "buses.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": bus_features}, indent=2)
    )
    (OUTPUT_DIR / "lines.geojson").write_text(
        json.dumps({"type": "FeatureCollection", "features": line_features}, indent=2)
    )
    print(f"Wrote {OUTPUT_DIR / 'buses.geojson'} ({len(bus_features)} buses)")
    print(f"Wrote {OUTPUT_DIR / 'lines.geojson'} ({len(line_features)} lines)")

    submarine_count = int(lines_df["is_submarine"].sum()) if "is_submarine" in lines_df.columns else 0
    manifest = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "power_flow_mode": power_flow_mode,
        "n_buses": len(bus_features),
        "n_lines": len(line_features),
        "n_submarine_lines": submarine_count,
        "total_load_mw": round(float(buses_df["p_mw"].sum()), 1) if "p_mw" in buses_df.columns else None,
        "total_gen_mw": round(float(buses_df["gen_mw"].sum()), 1) if "gen_mw" in buses_df.columns else None,
        "hvdc_import_mw": round(hvdc_import_mw, 1) if hvdc_import_mw is not None else None,
        "hvdc_capacity_mw": HVDC_CAPACITY_MW,
    }
    (OUTPUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {OUTPUT_DIR / 'manifest.json'}")


def main() -> None:
    buses_df, lines_df = load_inputs()
    net, _ = build_network(buses_df, lines_df)
    print(f"Network: {len(net.bus)} buses, {len(net.line)} lines.")

    unsupplied = top.unsupplied_buses(net)
    connected_names: set[str] = set()
    if unsupplied:
        names = sorted(net.bus.loc[list(unsupplied), "name"].tolist())
        print(f"Unsupplied buses ({len(names)}): {names[:5]}{'…' if len(names) > 5 else ''}")
    connected_names = set(net.bus["name"]) - set(
        net.bus.loc[list(unsupplied), "name"]
    )

    total_load = (
        net.load["p_mw"].sum() if not net.load.empty else 0
    )
    has_results = False
    hvdc_import_mw: float | None = None

    if total_load > 0:
        # DC load flow: tolerant of mixed-voltage networks, computes active power
        # and line loading. vm_pu is not solved (stays at 1.0); va_degree is computed.
        # Note: switching to AC (runpp) requires explicit transformer models between
        # the 350/230/138 kV buses — deferred to a future refactor.
        net_run = copy.deepcopy(net)
        unsup = list(top.unsupplied_buses(net_run))
        if unsup:
            pp.drop_buses(net_run, unsup)
        try:
            pp.rundcpp(net_run)
            print(f"DC load flow converged on {len(net_run.bus)} connected buses.")

            # Capture HVDC import: ext_grid p_mw > 0 means Luzon injecting into Visayas.
            if not net_run.res_ext_grid.empty:
                hvdc_import_mw = float(net_run.res_ext_grid["p_mw"].iloc[0])
                if abs(hvdc_import_mw) > HVDC_CAPACITY_MW:
                    print(
                        f"WARNING: HVDC import {hvdc_import_mw:.0f} MW exceeds "
                        f"rated capacity {HVDC_CAPACITY_MW} MW."
                    )
                direction = "import" if hvdc_import_mw >= 0 else "export"
                print(f"HVDC ({direction}): {hvdc_import_mw:+.1f} MW at Ormoc.")

            for _, lrow in net_run.line.iterrows():
                idx = net.line.index[net.line["name"] == lrow["name"]]
                if len(idx):
                    src = net_run.line.index[net_run.line["name"] == lrow["name"]][0]
                    net.res_line.loc[idx[0], "loading_percent"] = net_run.res_line.at[src, "loading_percent"]
                    net.res_line.loc[idx[0], "p_from_mw"] = net_run.res_line.at[src, "p_from_mw"]
                    net.res_line.loc[idx[0], "i_from_ka"] = net_run.res_line.at[src, "i_from_ka"]
            for _, brow in net_run.bus.iterrows():
                idx = net.bus.index[net.bus["name"] == brow["name"]]
                if len(idx):
                    src = net_run.bus.index[net_run.bus["name"] == brow["name"]][0]
                    net.res_bus.loc[idx[0], "vm_pu"] = net_run.res_bus.at[src, "vm_pu"]
                    net.res_bus.loc[idx[0], "va_degree"] = net_run.res_bus.at[src, "va_degree"]
            has_results = True
        except Exception as e:
            print(f"DC load flow failed: {e}. Emitting topology without results.")
    else:
        print("No loads defined (p_mw==0 everywhere). Skipping load flow.")

    emit_geojson(
        buses_df, lines_df, net, has_results, connected_names,
        hvdc_import_mw=hvdc_import_mw,
        power_flow_mode="DC" if has_results else "none",
    )


if __name__ == "__main__":
    main()
