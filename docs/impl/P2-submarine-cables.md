# P2 — Submarine Cable Electrical Parameters

**Files changed:** `scripts/constants.py`, `scripts/process_temp.py`, `scripts/build_data.py`, `data/lines.csv`  
**Type:** Data improvement — changes electrical parameters for 5 submarine lines

---

## What

The five submarine transmission lines in the Visayas network now use calibrated XLPE 630 mm² cable parameters from IEC 60840, instead of parameters derived by dividing the NGCP total circuit impedance by the haversine (great-circle) distance between bus endpoints.

A new `c_nf_per_km` column was added to `data/lines.csv`. Submarine cables receive `c = 200 nF/km`; overhead lines receive `c = 0` (shunt capacitance is irrelevant to DC load flow and deferred to when AC flow is implemented).

**Before (all five submarine lines had values like this):**

```
r_ohm_per_km: 0.120614    ← NGCP total ÷ haversine km
x_ohm_per_km: 0.171283    ← same derivation
c_nf_per_km:  (column didn't exist)
max_i_ka:     0.5774       ← s_nom / (√3 × v_line)
```

**After:**

```
r_ohm_per_km: 0.0754      ← IEC 60840, Cu 630 mm² at 90°C
x_ohm_per_km: 0.121       ← IEC 60287, flat formation
c_nf_per_km:  200.0       ← IEC 60840, 220 kV XLPE class
max_i_ka:     0.645        ← IEC 60287 ampacity in seawater
```

The five affected lines:

| Line | Route |
|---|---|
| `L_Bantap_Buenavista_Guimaras_69` | Panay → Guimaras |
| `L_Amlan_Samboan_138` | Negros → Cebu (138 kV) |
| `L_Magdugo_Calatrava_230` | Cebu → Negros (230 kV) |
| `L_Daanbantayan_Tabango_230` | Cebu → Leyte (230 kV) |
| `L_Maasin_Ubay_138` | Leyte → Bohol |

---

## Why

### The haversine-derived values are unreliable for submarine cables

For overhead lines the haversine distance (straight-line great-circle) is a reasonable proxy for line length — overhead routes generally follow the shortest path between towers. The per-km impedance derived by dividing total circuit impedance by haversine length is therefore approximately correct.

Submarine cables are different in two ways:

1. **Routing is not straight-line.** Submarine cables follow the seabed topology — they go around underwater ridges, avoid shipping lanes, and are laid with slack. The actual cable length is typically 5–30% longer than the straight-line distance. Dividing by haversine overestimates per-km impedance.

2. **Technology is fundamentally different.** XLPE-insulated submarine cables have much lower resistance per km than overhead ACSR conductors (because they use solid copper conductors, not steel-reinforced aluminium), significantly higher capacitance (heavy XLPE insulation), and different current capacity (limited by seawater cooling, not air).

Using NGCP total values divided by haversine for submarine cables mixes up these differences in an unpredictable way. For example, the `L_Amlan_Samboan_138` line (Cebu–Negros) had `r = 0.120614 Ω/km` — the same value as a 138 kV overhead ACSR line — which is coincidental, not physical.

### Visual realism

With the previous parameters, the InfoPanel showed submarine lines as electrically identical to overhead lines (except for the dashed stroke). The corrected parameters make the panel display numbers that match real submarine cable specs, which matters for a grid visualization claiming to be based on NGCP data.

### Preparation for AC load flow

When AC load flow is eventually implemented (see `docs/impl/P1-ac-loadflow-deferred.md`), shunt capacitance (`c_nf_per_km`) will become important. Submarine cables at 220 kV with 200 nF/km and lengths of 30–100 km generate significant charging current (`I_c = ωCVl`), which affects reactive power balance and voltage profiles. Having the correct `c` values in the CSV now means the switch to AC won't require redoing the cable data.

---

## How

### `scripts/constants.py` — `SUBMARINE_XLPE` dict

```python
SUBMARINE_XLPE: dict[str, float] = {
    "r_ohm_per_km": 0.0754,   # DC resistance at 90°C, Cu 630 mm²
    "x_ohm_per_km": 0.121,    # inductive reactance (laid, flat formation)
    "c_nf_per_km":  200.0,    # shunt capacitance (XLPE, 220 kV class)
    "max_i_ka":     0.645,    # ampacity in seawater (IEC 60287)
}
```

These are sourced from IEC standards:
- **r** — IEC 60228 Class 2 Cu 630 mm², DC resistance at max operating temperature (90°C)
- **x** — IEC 60287, typical laid flat formation for submarine cables
- **c** — IEC 60840, 127/220 kV class XLPE cable
- **max_i** — IEC 60287-1, ampacity in seawater at 25°C, flat formation, no burial

### `scripts/process_temp.py` — line building block

The line record construction was refactored to branch on `is_submarine`:

```python
is_submarine = frozenset({bus0, bus1}) in SUBMARINE_PAIRS

if is_submarine:
    # Use calibrated XLPE values — NGCP total ÷ haversine is unreliable for
    # sub-sea spans where cable routing ≠ great-circle path.
    r_per_km = SUBMARINE_XLPE["r_ohm_per_km"]
    x_per_km = SUBMARINE_XLPE["x_ohm_per_km"]
    c_per_km = SUBMARINE_XLPE["c_nf_per_km"]
    max_i_ka = SUBMARINE_XLPE["max_i_ka"]
else:
    r_per_km = round(r_total / length_km, 6)    # NGCP total ÷ haversine
    x_per_km = round(x_total / length_km, 6)
    c_per_km = 0.0   # overhead: omit for DC flow; add per voltage when AC
    max_i_ka = round(s_nom_mva / (math.sqrt(3) * v_line), 4)
```

The `rec` dict now includes `c_nf_per_km`:

```python
rec = {
    ...
    "r_ohm_per_km": r_per_km,
    "x_ohm_per_km": x_per_km,
    "c_nf_per_km":  c_per_km,   ← new column
    "max_i_ka":     max_i_ka,
    ...
}
```

### `scripts/build_data.py` — line creation

The hardcoded `c_nf_per_km=0` in `pp.create_line_from_parameters` was replaced with the column value:

```python
has_c = "c_nf_per_km" in lines_df.columns
for _, row in lines_df.iterrows():
    ...
    c_nf = float(row["c_nf_per_km"]) if has_c and pd.notna(row.get("c_nf_per_km")) else 0.0
    pp.create_line_from_parameters(
        net, ...,
        c_nf_per_km=c_nf,   ← was hardcoded 0
        ...
    )
```

The `has_c` guard ensures old `lines.csv` files without the column still work.

---

## Effect on load flow results

For DC load flow, `r` and `x` affect active power distribution (MW on each branch) and line loading percentages. Capacitance `c` has no effect on DC load flow — it only matters for AC.

The submarine lines that changed:

- **Lower r** (0.0754 vs ~0.12) → lower series resistance → lower impedance relative to parallel overhead paths → more power routed through submarine cables → loading percentages on submarine lines increase slightly, adjacent overhead lines decrease.
- **Lower x** (0.121 vs ~0.17) → same direction.
- **Higher max_i_ka** (0.645 vs 0.5774) → the thermal limit is now higher → a given loading MW translates to a lower loading_percent → the cable is shown as less thermally stressed.

The combined effect: submarine inter-island lines (Cebu–Negros, Cebu–Leyte, etc.) carry slightly more of their "expected" share of the flow, and their loading percentages are more meaningful.

---

## Verification

After running `python scripts/process_temp.py`:

```python
import pandas as pd
lines = pd.read_csv("data/lines.csv")
sub = lines[lines["is_submarine"] == True]
print(sub[["line_id","r_ohm_per_km","x_ohm_per_km","c_nf_per_km","max_i_ka"]])
```

Expected output — all five rows should show `r=0.0754`, `x=0.121`, `c=200.0`, `max_i=0.645`.

In the frontend, clicking a submarine line (e.g. Magdugo → Calatrava) in InfoPanel should show:
- **r:** 0.0754 Ω/km
- **x:** 0.121 Ω/km
- **Imax:** 0.645 kA

These values match IEC 60840 specs for a 630 mm² XLPE submarine cable.
