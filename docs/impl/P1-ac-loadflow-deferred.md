# P1 — AC Load Flow (Deferred)

**Status:** Not implemented — blocked by network model limitation  
**Planned change:** Replace `pp.rundcpp` with `pp.runpp` (Newton-Raphson AC)

---

## What was planned

The original roadmap proposed switching from DC load flow (`pp.rundcpp`) to AC Newton-Raphson load flow (`pp.runpp`). This would unlock:

- **Real voltage magnitudes** (`vm_pu`) that vary across the network, instead of the current flat 1.0 pu at every bus
- **Reactive power flows** (MVAR) on each branch
- **Voltage violations** — buses deviating outside the ±5% band
- **Reactive power contribution** from generators

The frontend already has the `vm_pu` and `va_degree` fields wired up in `InfoPanel.jsx` and ready for display. The only output that would improve is that `vm_pu` would show meaningful values (e.g. 0.97–1.03 range) instead of the current constant `1.000`.

---

## Why it was deferred

### The core problem: mixed-voltage buses connected by lines with no transformers

The Visayas network in this model has buses at four nominal voltage levels:

| Voltage | Example buses |
|---|---|
| 350 kV | Ormoc (HVDC terminus) |
| 230 kV | Kananga, Tabango, Daanbantayan, Magdugo, … |
| 138 kV | Babatngon, Tongonan, Isabel, Mandaue, Colon, … |
| 69 kV | Bantap, Tapal |

In pandapower, each bus has a `vn_kv` (nominal voltage). When two buses at **different** nominal voltages are connected by a line element (not a transformer), pandapower uses each bus's `vn_kv` to convert between physical impedance (Ω) and per-unit impedance. If the two ends have different voltage bases, the per-unit representation of the line is inconsistent — the impedance seen from the 230 kV end will be different from the impedance seen from the 350 kV end, giving wrong results.

### Concrete example: Ormoc

Looking at `data/lines.csv`:

```
L_Kananga_Ormoc_230   from: Kananga (230 kV)  to: Ormoc (350 kV)  voltage: 230 kV
L_Ormoc_Tongonan_138  from: Ormoc  (350 kV)  to: Tongonan (138 kV) voltage: 138 kV
L_Ormoc_Isabel_138    from: Ormoc  (350 kV)  to: Isabel   (138 kV) voltage: 138 kV
L_Ormoc_Babatngon_138 from: Ormoc  (350 kV)  to: Babatngon(138 kV) voltage: 138 kV
L_Ormoc_Maasin_138    from: Ormoc  (350 kV)  to: Maasin   (138 kV) voltage: 138 kV
```

Ormoc (nominal 350 kV in the model) is connected via 230 kV lines and 138 kV lines to adjacent buses at those respective voltages. In Newton-Raphson:

- The admittance matrix (Y-bus) is built in per-unit on each bus's own voltage base.
- A 230 kV line between Kananga (230 kV base) and Ormoc (350 kV base) would be represented with different per-unit impedances at each end — structurally wrong.
- The NR iteration would converge (or diverge) to physically meaningless voltage angles.

### Why does DC load flow work?

DC load flow linearises the power flow equations by:
1. Ignoring voltage magnitudes (all set to 1.0 pu)
2. Ignoring reactive power (all loads and generators treated as pure P)
3. Ignoring resistance (using only reactance X for flow distribution)

Under these simplifications, voltage base mismatches don't matter — the flow distribution depends only on relative line reactances, which pandapower calculates from physical `x_ohm_per_km × length_km` in absolute Ω. The per-unit conversion (which is where voltage base matters) is not performed.

This is why DC load flow is "tolerant of mixed-voltage networks" — it avoids the very computation that breaks AC load flow.

---

## What the physical network actually looks like

The mismatch in the model reflects a deliberate simplification. In reality, the Ormoc substation has:

- A **DC converter hall** that interfaces the ±350 kV DC link with the local AC system
- A **230 kV AC busbar** that connects to the Kananga–Tabango backbone via a 230 kV line
- A **138 kV AC busbar** that connects to Tongonan, Isabel, Babatngon, Maasin via 138 kV lines
- **Power transformers** (230/138 kV) connecting the two AC busbars inside the substation

The current model collapses the entire Ormoc substation into a single bus node tagged `v_nom = 350` (the DC voltage) and wires all four connection voltages directly to it. This is fine for topology visualization and DC flow, but structurally wrong for AC flow.

The same issue exists at other multi-voltage substations:

- **KSPC** (`v_nom = 230`) connects to Colon via a 138 kV line
- **Magdugo** (`v_nom = 230`) connects to Daan Lungsod via a 138 kV line
- **Compostela** (`v_nom = 230`) connects to Mandaue via a 138 kV line

Each of these represents a substation with internal transformers that the model doesn't include.

---

## What implementing P1 requires

To implement AC load flow correctly, the following changes are needed:

### 1. Split multi-voltage substations

Each substation with multiple voltage levels needs separate buses:

```
"Ormoc 230" — vn_kv=230, is_slack=True  (AC side of HVDC)
"Ormoc 138" — vn_kv=138
```

### 2. Add transformer models

Connect the split buses with `pp.create_transformer_from_parameters`:

```python
# 230/138 kV autotransformer at Ormoc (typical parameters)
pp.create_transformer_from_parameters(
    net,
    hv_bus=bus_idx["Ormoc 230"],
    lv_bus=bus_idx["Ormoc 138"],
    sn_mva=200,         # rated MVA
    vn_hv_kv=230,
    vn_lv_kv=138,
    vkr_percent=0.5,    # short-circuit resistance
    vk_percent=12.5,    # short-circuit impedance
    pfe_kw=0,           # iron losses (simplified)
    i0_percent=0,
    shift_degree=0,
)
```

Realistic transformer parameters for Philippine 230/138 kV autotransformers are available in NGCP TDP Annex B.

### 3. Update line routing

Lines that currently connect to "Ormoc" (350 kV bus) need to be redirected to the correct voltage bus:

- `L_Kananga_Ormoc_230` → `to_bus = "Ormoc 230"`
- `L_Ormoc_Tongonan_138` → `from_bus = "Ormoc 138"`
- `L_Ormoc_Isabel_138` → `from_bus = "Ormoc 138"`
- etc.

### 4. Add reactive power to generators

For NR convergence on a weak network, generators need reactive power capability. The largest generators (Tongonan, Daan Lungsod, KSPC, Palinpinon 1/2) should be converted from `sgen` (constant PQ) to `gen` (PV bus) with:

```python
pp.create_gen(
    net,
    bus=bus_idx["Tongonan"],
    p_mw=102.4,        # from dispatch_mw
    vm_pu=1.02,        # voltage setpoint
    max_q_mvar=61.4,   # ≈ 0.6 × p_mw (typical Q capability)
    min_q_mvar=-41.0,  # ≈ -0.4 × p_mw
)
```

### 5. Update `emit_geojson` to use "AC" power flow mode

```python
emit_geojson(..., power_flow_mode="AC")
```

And update the `manifest.json` footer label in StatsPanel.

### 6. NR fallback to DC

Even with the correct transformer model, NR may diverge for certain operating conditions. Keep the DC fallback:

```python
try:
    pp.runpp(net_run, algorithm="nr", calculate_voltage_angles=True, init="flat")
    power_flow_mode = "AC"
except Exception:
    pp.rundcpp(net_run)
    power_flow_mode = "DC"
```

---

## Data needed for P1

| Item | Source |
|---|---|
| Transformer MVA ratings at each substation | NGCP TDP 2024 Annex B |
| Transformer % impedance (vk_percent) | NGCP TDP 2024 Annex B |
| Generator Qmin/Qmax capability | NGCP TDP 2024 Chapter 4 or plant specs |
| Overhead `c_nf_per_km` per voltage class | IEEE Std 738 / NGCP line data |

---

## Value once implemented

| Currently (DC) | With AC |
|---|---|
| `vm_pu = 1.000` at every bus | `vm_pu` varies 0.95–1.05 typical |
| No reactive power flows | MVAR on each branch |
| No voltage violation detection | Buses outside ±5% band visible |
| No reactive power dispatch | Generator Q injections shown |

The frontend InfoPanel already shows `vm_pu` under the "Flow" section — it just always reads `1.000` today. Switching to AC will immediately make this field meaningful with no frontend changes required.
