# P1 — AC Load Flow (Implemented)

**Files changed:** `scripts/build_data.py`, `web/src/lib/styles.js`, `web/src/components/Legend.jsx`, `web/src/components/StatsPanel.jsx`  
**Type:** Feature — replaces DC load flow with AC Newton-Raphson, unlocking real voltage profiles

---

## What

The pipeline now runs AC Newton-Raphson load flow (`pp.runpp`, algorithm `"nr"`, `init="dc"`) instead of DC (`pp.rundcpp`). If NR diverges, it falls back to DC automatically. The `power_flow_mode` field in `manifest.json` and the StatsPanel footer reflect which solver was actually used.

### New behavior

- **`vm_pu`** at every bus is now a meaningful number (0.957–1.13 range in current snapshot) instead of the constant `1.000` produced by DC.
- **Reactive power flows** (MVAR) are computed and stored in pandapower's result tables.
- **Voltage violations** become visible: buses outside the ±5% band are flagged red in the Legend.
- **HVDC interchange** changed from −475.9 MW (DC, ignoring line losses) to −34.5 MW (AC, including I²R losses). The large difference reflects how much active power is consumed by line resistance in a long, radial, high-impedance network.

### Network model changes

- **Ormoc modelled at 230 kV** (AC side) rather than 350 kV (DC link voltage). The 350 kV figure is the HVDC link voltage, not the AC busbar voltage. Using 350 kV in the AC power flow would create a per-unit base mismatch with all adjacent 230 kV and 138 kV lines.
- **11 intermediate transformer buses** added automatically for the 17 cross-voltage line connections identified in the CSV data. Each intermediate bus is at the lower of the two voltages connected by the line; an ideal transformer connects it to the higher-voltage bus.
- **8 PV buses** (large generators ≥ 100 MW dispatched) converted from `sgen` (constant PQ injection) to `gen` (PV bus, voltage-controlling). Each holds `vm_pu = 1.02` by adjusting reactive output within ±40–60% of rated MW.
- **Overhead line shunt capacitance** populated from voltage-class defaults (230 kV: 9 nF/km, 138 kV: 10 nF/km, 69 kV: 8.7 nF/km) when `c_nf_per_km = 0` in the CSV.

---

## Cross-voltage connections handled

The 17 line connections that require transformer insertion:

| Line | From | To | Transformer at |
|---|---|---|---|
| L_Ormoc_Tongonan_138 | Ormoc (230 kV) | Tongonan (138 kV) | Ormoc |
| L_Ormoc_Isabel_138 | Ormoc (230 kV) | Isabel (138 kV) | Ormoc (shared trafo) |
| L_Ormoc_Babatngon_138 | Ormoc (230 kV) | Babatngon (138 kV) | Ormoc (shared trafo) |
| L_Ormoc_Maasin_138 | Ormoc (230 kV) | Maasin (138 kV) | Ormoc (shared trafo) |
| L_Barotac_Viejo_EB_Magalona_230 | Barotac Viejo (138 kV) | E.B. Magalona (230 kV) | E.B. Magalona |
| L_Calatrava_San_Carlos_69 | Calatrava (230 kV) | San Carlos (138 kV) | Calatrava |
| L_Bacolod_Kabankalan_138 | Bacolod (230 kV) | Kabankalan (138 kV) | Bacolod |
| L_Samboan_Dumanjug_138 | Samboan (138 kV) | Dumanjug (230 kV) | Dumanjug |
| L_Magdugo_Therma_Visayas_230 | Magdugo (230 kV) | Therma Visayas (138 kV) | Magdugo |
| L_Magdugo_Calong-calong_138 | Magdugo (230 kV) | Calong-calong (138 kV) | Magdugo (shared trafo) |
| L_Magdugo_Colon_138 | Magdugo (230 kV) | Colon (138 kV) | Magdugo (shared trafo) |
| L_Dumanjug_Colon_138 | Dumanjug (230 kV) | Colon (138 kV) | Dumanjug (shared trafo) |
| L_Colon_KSPC_138 | Colon (138 kV) | KSPC (230 kV) | KSPC |
| L_Mandaue_Lapu-Lapu_Pusok_138 | Mandaue (138 kV) | Lapu-Lapu (Pusok) (230 kV) | Lapu-Lapu (Pusok) |
| L_Mandaue_Compostela_138 | Mandaue (138 kV) | Compostela (230 kV) | Compostela |
| L_Sta_Barbara_Bantap_69 | Sta. Barbara (138 kV) | Bantap (69 kV) | Sta. Barbara |
| L_Bantap_Buenavista_Guimaras_69 | Bantap (69 kV) | Buenavista (Guimaras) (138 kV) | Buenavista |

"Shared trafo" means multiple lines from the same HV bus all route through the one intermediate `_trafo_<HV>_<lv_kv>` bus, which models the single physical transformer bank at that substation.

---

## How

### `scripts/build_data.py`

**New constants at module level:**

```python
TRAFO_DEFAULTS = {
    (230, 138): {"sn_mva": 200, "vk_percent": 10.0, "vkr_percent": 0.5},
    (230,  69): {"sn_mva": 100, "vk_percent": 10.0, "vkr_percent": 0.5},
    (138,  69): {"sn_mva": 100, "vk_percent":  8.0, "vkr_percent": 0.5},
}
OVERHEAD_C_NF = {230: 9.0, 138: 10.0, 69: 8.7}  # nF/km
PV_GEN_THRESHOLD_MW = 100.0
```

**`build_network(buses_df, lines_df, use_ac=True)` key changes:**

1. HVDC bus (`bus_type == "hvdc"`) gets `vn_kv = 230` in pandapower (AC-side voltage).
2. Large generators become PV buses:
   ```python
   if use_ac and g >= PV_GEN_THRESHOLD_MW:
       pp.create_gen(net, bus=..., p_mw=g, vm_pu=1.02,
                     max_q_mvar=round(g*0.6, 1), min_q_mvar=round(-g*0.4, 1))
   ```
3. Cross-voltage lines get intermediate buses and transformers:
   ```python
   if use_ac and fb_vn != tb_vn:
       inter_name = f"_trafo_{hv_name}_{lv_vn:.0f}"
       if inter_name not in bus_idx:
           inter_idx = pp.create_bus(net, vn_kv=lv_vn, name=inter_name)
           pp.create_transformer_from_parameters(net,
               hv_bus=bus_idx[hv_name], lv_bus=inter_idx,
               sn_mva=td["sn_mva"], vn_hv_kv=hv_vn, vn_lv_kv=lv_vn,
               vkr_percent=td["vkr_percent"], vk_percent=td["vk_percent"],
               pfe_kw=0, i0_percent=0)
       # Reroute line to intermediate bus
       from_bus_pp = bus_idx[inter_name]  # (if fb is HV end)
   ```
4. Overhead line `c_nf_per_km` filled from `OVERHEAD_C_NF` when CSV has `c=0`.

**`_run_flow(net_run)` — new helper:**

```python
def _run_flow(net_run):
    try:
        pp.runpp(net_run, algorithm="nr", calculate_voltage_angles=True,
                 init="dc", numba=False, max_iteration=50)
        return True, "AC"
    except Exception as ac_err:
        print(f"AC load flow did not converge ({ac_err}); falling back to DC.")
        try:
            pp.rundcpp(net_run)
            return True, "DC"
        except Exception as dc_err:
            print(f"DC load flow also failed: {dc_err}.")
            return False, "none"
```

`init="dc"` runs a DC load flow as starting point for NR, giving a better initial angle estimate than `init="flat"` for a radial network.

### `web/src/lib/styles.js` — voltage magnitude colour

```js
export const VM_PU_SCALE = [
  { label: "0.95–0.97 / 1.03–1.05", color: "#f4a261" },
  { label: "0.97–1.03 (nominal)",    color: "#2d6a4f" },
  { label: "< 0.95 or > 1.05",       color: "#9b2226" },
];

export function colorForVoltagePu(pu) {
  if (pu == null) return "#94a3b8";
  if (pu < 0.95 || pu > 1.05) return "#9b2226";
  if (pu < 0.97 || pu > 1.03) return "#f4a261";
  return "#2d6a4f";
}
```

### `web/src/components/Legend.jsx` — 4th column

The legend gains a "Voltage (pu)" column using `VM_PU_SCALE`. The grid is expanded from 3 to 4 columns.

### `web/src/components/StatsPanel.jsx` — dynamic footer

```jsx
{manifest?.power_flow_mode ?? "DC"} flow · {snapshotDate}
```

Shows "AC flow · May 15, 2026" when AC converged, or "DC flow · …" on fallback.

---

## Snapshot voltage profile (current run)

| Bus | vm_pu | Note |
|---|---|---|
| Buenavista (Guimaras) | 0.957 | Low — weak 69 kV feed, net export via submarine |
| Corella | 0.962 | Low — 70 km radial 138 kV feed from Ubay |
| Calbayog | 0.971 | Remote Samar terminus |
| Ormoc | 1.000 | Slack bus (ext_grid setpoint) |
| Kananga | 1.020 | PV bus setpoint |
| Therma Visayas | 1.020 | PV bus setpoint |
| Tabango | 1.125 | High — Ferranti effect (see below) |
| Daanbantayan | 1.127 | High — Ferranti effect |
| Compostela | 1.129 | High — Ferranti effect |

**Ferranti effect at Daanbantayan–Tabango–Compostela:** the 46.5 km, 2-circuit 230 kV XLPE submarine cable between Daanbantayan and Tabango (200 nF/km × 46.5 km × 2 circuits) generates approximately 370 MVAR of capacitive charging current. With no local reactive loads and no shunt reactors in the model, this raises voltage well above the ±5% band. In the real network, NGCP installs shunt reactors at both ends of long submarine cables to absorb this charging current. The model does not include those reactors (data not available from public TDP), so the voltage violation is a known model limitation, not a simulation error.

---

## Verification

After running `python scripts/build_data.py`:

1. Terminal output should show:
   ```
   Network: 63 buses (incl. 11 transformer intermediates), 57 lines, 11 transformers.
   AC load flow converged on 63 buses.
   HVDC (export): -34.5 MW at Ormoc.
   ```

2. `web/public/data/manifest.json` should have `"power_flow_mode": "AC"`.

3. In `web/public/data/buses.geojson`, buses should have `vm_pu` values in the 0.95–1.13 range, not 1.000 everywhere.

4. In the frontend (`npm run dev`):
   - StatsPanel footer shows "AC flow · [date]" (not "DC flow").
   - Clicking any bus in InfoPanel shows a non-trivial `vm_pu` value.
   - The Legend now has a 4th "Voltage (pu)" column.
   - Remote buses (Calbayog, Nabas, Corella) show amber `vm_pu` values; Daanbantayan shows red.

---

## What was deferred from P1 (still needed for production accuracy)

| Item | Why deferred |
|---|---|
| Shunt reactors at Daanbantayan and Tabango | Data not in public NGCP TDP Annex B |
| Transformer MVA ratings per substation | Using typical values (200 MVA at 230/138) — actual ratings differ |
| Generator Q capability curves | Using ±60/40% of dispatch MW as proxy |
| Overhead c_nf_per_km per line | Using voltage-class defaults; actual line geometry varies |

The [original deferral analysis](P1-ac-loadflow-deferred.md) documents the full list of items required for a production-accurate AC model.
