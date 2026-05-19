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
    - AC Newton-Raphson load flow is attempted first (pp.runpp, init="dc").
      If it diverges, falls back to DC load flow (pp.rundcpp).
      power_flow_mode in manifest.json reflects which solver converged.
    - Cross-voltage connections (lines between buses at different nominal voltages)
      are handled by inserting intermediate buses and ideal transformer models so
      every line operates at a single per-unit voltage base.
    - Large generators (>= PV_GEN_THRESHOLD_MW) are modelled as PV buses (gen)
      with voltage setpoints and Q limits to support NR convergence.
    - After load flow, HVDC import at Ormoc is captured from ext_grid results and
      stored on the Ormoc bus feature and in manifest.json.
"""

from __future__ import annotations

import copy
import argparse
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

# Typical autotransformer parameters for the Philippine HV network.
# (hv_kv, lv_kv) → {sn_mva, vk_percent, vkr_percent}
# Source: NGCP TDP 2024 Annex B typical values; pfe_kw/i0_percent set to 0
# (ideal core — negligible effect on power flow results).
TRAFO_DEFAULTS: dict[tuple[int, int], dict] = {
    (230, 138): {"sn_mva": 200, "vk_percent": 10.0, "vkr_percent": 0.5},
    (230,  69): {"sn_mva": 100, "vk_percent": 10.0, "vkr_percent": 0.5},
    (138,  69): {"sn_mva": 100, "vk_percent":  8.0, "vkr_percent": 0.5},
}

# Overhead line shunt capacitance by voltage class used when lines.csv has c=0.
# Source: IEEE Std 738 / typical ACSR Drake parameters.
OVERHEAD_C_NF: dict[int, float] = {
    230: 9.0,   # nF/km
    138: 10.0,  # nF/km
     69: 8.7,   # nF/km
}

# Generators at or above this dispatched MW are converted to PV buses
# (voltage-controlling) for AC load flow NR convergence.
PV_GEN_THRESHOLD_MW = 100.0


def load_inputs() -> tuple[pd.DataFrame, pd.DataFrame]:
    if not BUSES_CSV.exists() or not LINES_CSV.exists():
        sys.exit(
            "Missing input CSVs. Run scripts/process_temp.py first to "
            "generate data/buses.csv and data/lines.csv."
        )
    return pd.read_csv(BUSES_CSV), pd.read_csv(LINES_CSV)


def build_network(
    buses_df: pd.DataFrame,
    lines_df: pd.DataFrame,
    use_ac: bool = True,
):
    """Build a pandapower network from cleaned CSV data.

    When use_ac=True (default):
    - The HVDC terminus (Ormoc) is modelled at its AC-side voltage (230 kV)
      rather than the 350 kV DC link voltage, eliminating the main voltage-base
      mismatch that prevents AC Newton-Raphson from converging.
    - Each cross-voltage line connection gets an intermediate bus at the lower
      voltage plus an ideal transformer, so every line runs at a single per-unit
      base. Intermediate buses are named "_trafo_<HV_bus>_<lv_kv>".
    - Large generators (>= PV_GEN_THRESHOLD_MW) become PV buses (gen) with
      reactive capability so NR has voltage support across the network.
    - Overhead line shunt capacitance is populated from OVERHEAD_C_NF.

    When use_ac=False (DC fallback build):
    - All buses keep their CSV v_nom (Ormoc stays at 350 kV).
    - No transformer models are inserted.
    - All generators are modelled as sgen (PQ injection).
    - c_nf_per_km values come from the CSV as-is.
    """
    net = pp.create_empty_network(f_hz=60)
    bus_idx: dict[str, int] = {}
    bus_vnom: dict[str, float] = {}

    for _, row in buses_df.iterrows():
        vn = float(row["v_nom"])
        if use_ac and row.get("bus_type") == "hvdc":
            # The HVDC terminus couples to the AC network at 230 kV.
            # Using 350 kV (the DC link voltage) creates a per-unit base
            # mismatch with every adjacent 230 kV and 138 kV line.
            vn = 230.0
        idx = pp.create_bus(
            net,
            vn_kv=vn,
            name=row["name"],
            geodata=(float(row["y"]), float(row["x"])),
        )
        bus_idx[row["name"]] = idx
        bus_vnom[row["name"]] = vn

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
            if g <= 0:
                continue
            if use_ac and g >= PV_GEN_THRESHOLD_MW:
                pp.create_gen(
                    net,
                    bus=bus_idx[row["name"]],
                    p_mw=g,
                    vm_pu=1.02,
                    max_q_mvar=round(g * 0.6, 1),
                    min_q_mvar=round(-g * 0.4, 1),
                    slack=False,
                    name=f"{row['name']}_gen",
                )
            else:
                pp.create_sgen(
                    net,
                    bus=bus_idx[row["name"]],
                    p_mw=g,
                    q_mvar=0,
                    name=f"{row['name']}_gen",
                )

    has_parallel = "parallel" in lines_df.columns
    has_c = "c_nf_per_km" in lines_df.columns
    missing = []

    for _, row in lines_df.iterrows():
        fb, tb = str(row["from_bus"]), str(row["to_bus"])
        if fb not in bus_idx or tb not in bus_idx:
            missing.append(row["line_id"])
            continue

        fb_vn = bus_vnom[fb]
        tb_vn = bus_vnom[tb]
        c_nf = float(row["c_nf_per_km"]) if has_c and pd.notna(row.get("c_nf_per_km")) else 0.0
        from_bus_pp = bus_idx[fb]
        to_bus_pp = bus_idx[tb]

        if use_ac and fb_vn != tb_vn:
            # Cross-voltage connection: insert intermediate bus + transformer at
            # the HV end so the line runs at a single voltage base.
            hv_name = fb if fb_vn > tb_vn else tb
            lv_vn = min(fb_vn, tb_vn)

            inter_name = f"_trafo_{hv_name}_{lv_vn:.0f}"
            if inter_name not in bus_idx:
                inter_idx = pp.create_bus(net, vn_kv=lv_vn, name=inter_name)
                bus_idx[inter_name] = inter_idx
                bus_vnom[inter_name] = lv_vn

                hv_vn = max(fb_vn, tb_vn)
                key = (int(hv_vn), int(lv_vn))
                td = TRAFO_DEFAULTS.get(
                    key,
                    {"sn_mva": 100, "vk_percent": 10.0, "vkr_percent": 0.5},
                )
                pp.create_transformer_from_parameters(
                    net,
                    hv_bus=bus_idx[hv_name],
                    lv_bus=inter_idx,
                    sn_mva=td["sn_mva"],
                    vn_hv_kv=float(max(fb_vn, tb_vn)),
                    vn_lv_kv=float(lv_vn),
                    vkr_percent=td["vkr_percent"],
                    vk_percent=td["vk_percent"],
                    pfe_kw=0,
                    i0_percent=0,
                )

            # Route the line to/from the LV side of the new transformer.
            if fb_vn > tb_vn:
                from_bus_pp = bus_idx[inter_name]
            else:
                to_bus_pp = bus_idx[inter_name]

        # For AC flow, overhead lines need non-zero shunt capacitance.
        is_sub = bool(row.get("is_submarine", False))
        if use_ac and c_nf == 0.0 and not is_sub:
            line_vn = int(min(fb_vn, tb_vn))
            c_nf = OVERHEAD_C_NF.get(line_vn, 0.0)

        parallel = int(row["parallel"]) if has_parallel and pd.notna(row["parallel"]) else 1
        pp.create_line_from_parameters(
            net,
            from_bus=from_bus_pp,
            to_bus=to_bus_pp,
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


def _run_flow(net_run) -> tuple[bool, str]:
    """Attempt AC Newton-Raphson; fall back to DC. Returns (converged, mode)."""
    try:
        pp.runpp(
            net_run,
            algorithm="nr",
            calculate_voltage_angles=True,
            init="dc",
            numba=False,
            max_iteration=50,
        )
        return True, "AC"
    except Exception as ac_err:
        print(f"AC load flow did not converge ({ac_err}); falling back to DC.")
        try:
            pp.rundcpp(net_run)
            return True, "DC"
        except Exception as dc_err:
            print(f"DC load flow also failed: {dc_err}.")
            return False, "none"


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
                props["vm_pu"] = round(float(net.res_bus.at[idx, "vm_pu"]), 4)
                props["va_degree"] = round(float(net.res_bus.at[idx, "va_degree"]), 4)
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
                props["loading_percent"] = round(float(net.res_line.at[idx, "loading_percent"]), 2)
                props["p_from_mw"] = round(float(net.res_line.at[idx, "p_from_mw"]), 3)
                props["i_from_ka"] = round(float(net.res_line.at[idx, "i_from_ka"]), 5)
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
    parser = argparse.ArgumentParser(description="Build grid GeoJSON.")
    parser.add_argument(
        "--mode",
        choices=["ac", "dc"],
        default="ac",
        help="ac: AC Newton-Raphson with transformer models (default, "
        "written to web/public/data). dc: linear DC power flow with the "
        "simplified build, written to web/public/data/dc.",
    )
    args = parser.parse_args()
    use_ac = args.mode == "ac"

    if args.mode == "dc":
        global OUTPUT_DIR
        OUTPUT_DIR = OUTPUT_DIR / "dc"

    buses_df, lines_df = load_inputs()
    net, _ = build_network(buses_df, lines_df, use_ac=use_ac)
    print(
        f"Network: {len(net.bus)} buses (incl. {len(net.trafo)} transformer intermediates), "
        f"{len(net.line)} lines, {len(net.trafo)} transformers."
    )

    unsupplied = top.unsupplied_buses(net)
    if unsupplied:
        names = sorted(
            n for n in net.bus.loc[list(unsupplied), "name"]
            if not str(n).startswith("_trafo_")
        )
        print(f"Unsupplied buses ({len(names)}): {names[:5]}{'…' if len(names) > 5 else ''}")

    # Exclude internal transformer buses from the connected-names set.
    connected_names: set[str] = {
        n for n in net.bus["name"]
        if not str(n).startswith("_trafo_")
    } - {
        net.bus.at[i, "name"]
        for i in unsupplied
        if not str(net.bus.at[i, "name"]).startswith("_trafo_")
    }

    total_load = net.load["p_mw"].sum() if not net.load.empty else 0
    has_results = False
    hvdc_import_mw: float | None = None
    power_flow_mode = "none"

    if total_load > 0:
        net_run = copy.deepcopy(net)
        unsup = list(top.unsupplied_buses(net_run))
        if unsup:
            pp.drop_buses(net_run, unsup)

        if use_ac:
            has_results, power_flow_mode = _run_flow(net_run)
        else:
            try:
                pp.rundcpp(net_run)
                has_results, power_flow_mode = True, "DC"
            except Exception as dc_err:  # noqa: BLE001
                print(f"DC load flow failed: {dc_err}.")
                has_results, power_flow_mode = False, "none"

        if has_results:
            print(f"{power_flow_mode} load flow converged on {len(net_run.bus)} buses.")

            if not net_run.res_ext_grid.empty:
                hvdc_import_mw = float(net_run.res_ext_grid["p_mw"].iloc[0])
                if abs(hvdc_import_mw) > HVDC_CAPACITY_MW:
                    print(
                        f"WARNING: HVDC import {hvdc_import_mw:.0f} MW exceeds "
                        f"rated capacity {HVDC_CAPACITY_MW} MW."
                    )
                direction = "import" if hvdc_import_mw >= 0 else "export"
                print(f"HVDC ({direction}): {hvdc_import_mw:+.1f} MW at Ormoc.")

            # Copy results back to the full network (net_run excludes unsupplied buses).
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
    else:
        print("No loads defined (p_mw==0 everywhere). Skipping load flow.")

    emit_geojson(
        buses_df, lines_df, net, has_results, connected_names,
        hvdc_import_mw=hvdc_import_mw,
        power_flow_mode=power_flow_mode,
    )


if __name__ == "__main__":
    main()
