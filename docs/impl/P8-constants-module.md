# P8 — Constants Module

**Files changed:** `scripts/constants.py` (new), `scripts/process_temp.py`  
**Type:** Refactor — no behavioural change

---

## What

All modeling constants that were previously scattered inline in `scripts/process_temp.py` were extracted into a new dedicated module, `scripts/constants.py`. Every constant now carries an inline source citation. `process_temp.py` and `build_data.py` import from this file instead of defining their own values.

Constants moved:

| Constant | Value | Purpose |
|---|---|---|
| `VISAYAS_PREFIXES` | `{04, 05, 06, 07, 08}` | Region filter |
| `SLACK_BUS` | `"Ormoc"` | Reference bus name |
| `HVDC_CAPACITY_MW` | `440` | HVDC rated capacity for warning |
| `MERGE_CODES` | `{04STARITATAP → 04STARITA}` | Duplicate bus aliases |
| `DROP_CODES` | `set()` | Codes to discard |
| `LOAD_MW_PER_FEEDER` | `12.0` | Per-feeder load assignment |
| `LOAD_PF_QP_RATIO` | `0.30` | Q/P for 0.96 PF |
| `DISPATCH_FACTOR` | per-carrier dict | Capacity → operating MW |
| `SUBMARINE_PAIRS` | frozenset pairs | Known submarine crossings |
| `CODE_INFO` | 52-entry dict | NGCP code → name/island/type |

New constants added for the P2 and P4 implementations (also live here):

| Constant | Purpose |
|---|---|
| `SUBMARINE_XLPE` | IEC 60840 parameters for 630 mm² Cu cable |
| `OVERHEAD_DEFAULTS` | Reference overhead values by voltage (not auto-applied) |

---

## Why

The old approach of defining constants inline creates several problems in a project like this:

1. **No provenance.** `LOAD_MW_PER_FEEDER = 12.0` appeared without any explanation of where 12 came from. If someone adjusts the number they have no idea what they're calibrating against.

2. **Scattered ownership.** `DISPATCH_FACTOR`, `SUBMARINE_PAIRS`, and `CODE_INFO` all lived in `process_temp.py`, but `build_data.py` was logically dependent on the same modeling assumptions (e.g. `HVDC_CAPACITY_MW`). With no shared module, any new script would have to re-define or re-import from the wrong place.

3. **Hard to audit.** A reviewer or collaborator reading the code has no single place to check "what assumptions does this model make?" — they have to grep through multiple files.

4. **Future risk.** The project plan explicitly anticipates scenarios (morning/evening/dry-season), each of which would need different `DISPATCH_FACTOR` values or `LOAD_MW_PER_FEEDER` overrides. A constants module is the natural place to manage that branching.

---

## How

### New file: `scripts/constants.py`

The file is organised into six sections, matching the model's concern areas:

```
Regional / topology      ← VISAYAS_PREFIXES, SLACK_BUS, HVDC_CAPACITY_MW,
                            MERGE_CODES, DROP_CODES

Submarine cable params   ← SUBMARINE_XLPE, OVERHEAD_DEFAULTS

Load modeling            ← LOAD_MW_PER_FEEDER, LOAD_PF_QP_RATIO

Generation dispatch      ← DISPATCH_FACTOR

Submarine identification ← SUBMARINE_PAIRS

Bus classification       ← CODE_INFO
```

Each constant has at least one source citation in its comment, e.g.:

```python
# Calibrated so that 140 Visayas feeders × 12 MW ≈ 1,680 MW ≈ Visayas 2024
# peak demand (NGCP TDP 2024 Table 3-2: ~2,100 MW including interruptible load).
LOAD_MW_PER_FEEDER = 12.0
```

```python
# tan(arccos(0.96)) ≈ 0.292, rounded to 0.30 for conservative Q estimation.
LOAD_PF_QP_RATIO = 0.30
```

```python
DISPATCH_FACTOR: dict[str, float] = {
    "Coal":       0.80,  # Baseload coal; includes Daan Lungsod, KSPC, Therma Visayas
    "Geothermal": 0.85,  # Near-baseload; Tongonan, Palinpinon 1/2, Kananga units
    ...
}
```

### `process_temp.py` — import block

The opening constant definitions were replaced with a single import block:

```python
from constants import (
    CODE_INFO,
    DISPATCH_FACTOR,
    DROP_CODES,
    HVDC_CAPACITY_MW,
    LOAD_MW_PER_FEEDER,
    LOAD_PF_QP_RATIO,
    MERGE_CODES,
    SLACK_BUS,
    SUBMARINE_PAIRS,
    SUBMARINE_XLPE,
    VISAYAS_PREFIXES,
)
```

`HVDC_CAPACITY_MW` is imported here even though `process_temp.py` doesn't use it directly — it makes the constant visible when you do `from process_temp import *` (useful for future scripting/testing).

### `build_data.py` — import

```python
from constants import HVDC_CAPACITY_MW
```

Only the one constant that `build_data.py` actually uses is imported (the HVDC capacity warning threshold).

---

## Verification

The behaviour of the pipeline is unchanged — this is a pure refactor. Verification:

```sh
python scripts/process_temp.py && python scripts/build_data.py
```

Output should be identical to pre-refactor: same bus count (52), same line count (57), same total load and generation. The only observable difference is that `process_temp.py` is shorter and `constants.py` exists.

To confirm no value changed, compare the generated `data/buses.csv` against a pre-refactor snapshot — all numeric columns should match.
