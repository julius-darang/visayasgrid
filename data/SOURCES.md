# Data Sources & Provenance — Visayas Grid

> Tracks where every value in `buses.csv` and `lines.csv` comes from.
> Started 2026-05-24 (Week 1 data-gathering block). Goal: migrate from
> PyPSA-PH-derived values to primary-source-verified data.
>
> **Rule: never record a value or URL that isn't real.** Unverified values
> are tagged `pypsa-ph` (inherited) or `estimate` — never `sourced`.

## Provenance tags

- `sourced` — confirmed against a primary/public reference; citation given.
- `pypsa-ph` — inherited from PyPSA-PH v1.0 base; not yet independently verified.
- `estimate` — engineering estimate (e.g. conductor-table impedance); not published by NGCP.

## Audit context

The current dataset is **not bespoke**: `data/temp/` is a Visayas slice of
**PyPSA-PH v1.0** (Arizeo C. Salac, DESTEC, University of Pisa) — 192 buses /
236 lines / 425 generators nationally, NGCP code scheme, demand benchmarked to
2023. Confirmed by identical national counts and shared bus codes
(`04ORMOC`, `05CEBU`, ...). The Visayas subset is 52 buses / 57 lines.

## Source registry

| ID | Source | Use | URL |
|----|--------|-----|-----|
| S1 | NGCP Transmission Development Plan 2023–2040 (Consultation Report) | substations, voltages, backbone, interconnections | https://ngcp.ph/Attachment-Uploads/TDP%202023-2040%20Consultation%20Report-2023-06-15-07-54-06.pdf |
| S2 | NGCP TDP 2022–2040 Report | same as S1 | https://ngcp.ph/Attachment-Uploads/Transmission%20Development%20Plan%202022-2040%20Report-2023-01-04-10-49-08.pdf |
| S3 | NGCP TDP 2016–2040 Final Report Vol.1 (Major Network Development) | submarine interconnection capacities | https://www.ngcp.ph/Attachment-Uploads/TDP%202016-2040%20Final%20Report%20Volume%201%20Major%20Network%20Development-2019-05-14-16-43-41.pdf |
| S4 | PyPSA-PH v1.0 (Salac, U. Pisa) — current data base | bus / line / generator base values | https://github.com/arizeosalac/PyPSA-PH · https://zenodo.org/records/15586573 |
| S5 | OpenStreetMap "Power networks/Philippines" + OpenInfraMap | coordinates, routing, substation footprints | https://wiki.openstreetmap.org/wiki/Power_networks/Philippines · https://openinframap.org/ |
| S6 | NGCP — Cebu-Negros-Panay 230 kV Backbone energized (article cid=16901) | CNP backbone, Amlan–Samboan cable | https://www.ngcp.ph/article?cid=16901 |
| S7 | Philstar — NGCP fully energizes P19.8B Cebu-Bohol interconnection (2024-11-27) | CBIP (Cebu–Bohol 230 kV) | https://www.philstar.com/business/2024/11/27/2403125/ngcp-fully-energizes-p198-billion-cebu-bohol-interconnection |
| S8 | HVDC Leyte–Luzon (Wikipedia) | Ormoc 350 kV HVDC slack terminal | https://en.wikipedia.org/wiki/HVDC_Leyte%E2%80%93Luzon |
| S9 | Global Energy Monitor — Cebu Energy power station (GCPT) | Daan Lungsod / CEDC coal coordinate (10.387158, 123.641023, "exact") | https://www.gem.wiki/Cebu_Energy_power_station |

## Inter-island interconnections — verified 2026-05-24

Visayas = five sub-grids (Panay, Negros, Cebu, Bohol, Leyte-Samar) joined by AC
submarine cables. Legacy capacities per S1/S3: Leyte–Cebu 2×185 MW, Cebu–Negros
2×90 MW, Negros–Panay 1×85 MW, Leyte–Bohol 1×90 MW.

| Interconnection | Our data line | Tagged | Verdict |
|---|---|---|---|
| Leyte–Cebu | `L_Daanbantayan_Tabango_230` | submarine | OK — present [S1/S3] |
| Cebu–Negros | `L_Amlan_Samboan_138` | submarine | OK — Amlan–Samboan named in S6 ✓ |
| Cebu–Negros (230 kV) | `L_Magdugo_Calatrava_230` | submarine | Plausible (CNP added 230 kV) — verify crossing point [S6] |
| Negros–Panay | `L_Barotac_Viejo_EB_Magalona_230` | submarine | FIXED 2026-05-24 — now `is_submarine=True` [S1/S3/S6] |
| Leyte–Bohol | `L_Maasin_Ubay_138` | submarine | OK — Leyte–Bohol 1×90 MW [S1/S3] |
| Cebu–Bohol (CBIP, 2024) | — | — | **MISSING → ADD** Argao–Maribojoc 230 kV, 1,200 MW, energized 2024-11-27 [S7] |
| Panay–Guimaras | `L_Bantap_Buenavista_Guimaras_69` | submarine | Plausible (local 69 kV) — verify [S5] |

Backbone context: the **CNP 230 kV backbone** (PhP67.98 B) was energized
2024-03-27 (ceremonial 2024-04-08), 400 MW carrying capacity at the 3rd stage,
442 ckm overhead + 98.9 ckm submarine, 10 new substations; it includes the
Negros–Panay Interconnection Project Line 2 and upgrades the Amlan–Samboan
Cebu–Negros cable [S6]. The **Ormoc 350 kV bus** is the Leyte–Luzon HVDC
terminal (Ormoc–Naga, Camarines Sur; 440 MW; 350 kV; in service since 1998),
correctly modeled as the system slack (HVDC import/export) [S8].

## Discrepancies to fix (actionable, this week)

1. ~~**Negros–Panay link mislabeled overhead.**~~ **DONE 2026-05-24.** Root
   cause was a bug in `process_temp.py`: `SUBMARINE_PAIRS` listed
   `{06GAHIT, 08STBARBRA}` (no line exists between them) instead of the real
   crossing `{06GAHIT, 08BAROTAC}`. Corrected; `L_Barotac_Viejo_EB_Magalona_230`
   is now `submarine_xlpe`. [S1/S3/S6]
2. **Missing Cebu–Bohol 230 kV (CBIP).** Add Argao (Cebu) ↔ Maribojoc (Bohol)
   230 kV, energized 2024-11-27. Data currently has only the older Leyte–Bohol
   tie (Maasin–Ubay). [S7] — *still open.*
3. ~~**Duplicate coordinates.**~~ **DONE 2026-05-24.** `05DAANLUNSOD` carried
   Daanbantayan's coordinate (north Cebu). Daan Lungsod is the CEDC coal complex
   in Toledo City; relocated to 10.387158, 123.641023 in `data/temp/buses.csv`. [S9]
4. **Anomalous inherited impedances.** Several lines carry r/x far above normal
   ACSR values: `L_Kananga_Ormoc_230` r=3.218 Ω/km (~20× a typical 230 kV
   conductor); `L_Tabango_Kananga_230` r=1.723; `L_Colon_Quiot_138` r=2.013;
   and **newly exposed by fix #3:** `L_Magdugo_Daan_Lungsod_138` now r=2.136 Ω/km
   — the inherited `r_total` (~11.4 Ω) was being divided by the wrong 94.5 km
   length and only *looked* normal; the true line is ~5.3 km. Recompute from
   conductor tables (138 kV ACSR ≈ 0.12 Ω/km). [estimate] — *still open.*
5. **Verify all 52 bus coordinates** against OSM/OpenInfraMap (currently
   `pypsa-ph`). [S5] — *still open.*

## Per-bus provenance (52 buses)

Values are the current `buses.csv` contents. `coord/value source` and `status`
describe verification state, not the number's origin (all numbers currently
trace to PyPSA-PH unless noted).

| # | name | island | v_nom | x (lon) | y (lat) | bus_type | status | notes |
|---|------|--------|------:|--------:|--------:|----------|--------|-------|
| 1 | Babatngon | Leyte | 138 | 124.896699 | 11.395501 | substation | pypsa-ph | verify vs OSM |
| 2 | Calbayog | Samar | 138 | 124.637913 | 12.055139 | substation | pypsa-ph | verify vs OSM |
| 3 | Isabel | Leyte | 138 | 124.448930 | 10.919333 | substation | pypsa-ph | Isabel/LIDE industrial area |
| 4 | Kananga | Leyte | 230 | 124.551309 | 11.164993 | substation | pypsa-ph | Tongonan geothermal hub; check 230 kV r/x |
| 5 | Maasin | Leyte | 138 | 124.779131 | 10.162555 | substation | pypsa-ph | Leyte–Bohol cable landing |
| 6 | Ormoc | Leyte | 350 | 124.644678 | 11.087485 | hvdc | sourced (role) | Leyte–Luzon HVDC terminal, slack [S8] |
| 7 | Paranas (Wright) | Samar | 138 | 125.041352 | 11.766751 | substation | pypsa-ph | verify vs OSM |
| 8 | Sta. Rita | Samar | 138 | 125.002051 | 11.395008 | substation | pypsa-ph | verify vs OSM |
| 9 | Tabango | Leyte | 230 | 124.343486 | 11.323472 | substation | pypsa-ph | Leyte–Cebu cable landing |
| 10 | Tongonan | Leyte | 138 | 124.637558 | 11.161314 | generator | pypsa-ph | geothermal |
| 11 | Calong-calong | Cebu | 138 | 123.667107 | 10.415730 | substation | pypsa-ph | verify vs OSM |
| 12 | Cebu | Cebu | 138 | 123.940856 | 10.365228 | substation | pypsa-ph | verify vs OSM |
| 13 | Colon | Cebu | 138 | 123.759877 | 10.222684 | substation | pypsa-ph | verify vs OSM |
| 14 | Compostela | Cebu | 230 | 124.006598 | 10.466498 | substation | pypsa-ph | verify vs OSM |
| 15 | Daanbantayan | Cebu | 230 | 123.956809 | 11.146434 | substation | pypsa-ph | north Cebu; verify vs OSM |
| 16 | Daan Lungsod | Cebu | 230 | 123.641023 | 10.387158 | substation | sourced [S9] | CEDC coal, Toledo City; fixed 2026-05-24 |
| 17 | Dumanjug | Cebu | 230 | 123.440547 | 10.036174 | substation | pypsa-ph | verify vs OSM |
| 18 | KSPC | Cebu | 230 | 123.762681 | 10.218271 | generator | pypsa-ph | KEPCO SPC Naga coal |
| 19 | Lapu-Lapu (Pusok) | Cebu | 230 | 123.968307 | 10.323833 | substation | pypsa-ph | Mactan |
| 20 | Magdugo | Cebu | 230 | 123.665698 | 10.345742 | substation | pypsa-ph | Cebu 230 kV hub |
| 21 | Mandaue | Cebu | 138 | 123.963923 | 10.334729 | substation | pypsa-ph | verify vs OSM |
| 22 | Naga (Visayas) | Cebu | 138 | 123.757037 | 10.254430 | substation | pypsa-ph | Naga, Cebu (not Luzon Naga) |
| 23 | Quiot | Cebu | 138 | 123.856109 | 10.287923 | substation | pypsa-ph | check r/x of feeder line |
| 24 | Samboan | Cebu | 138 | 123.311701 | 9.552395 | substation | pypsa-ph | Cebu–Negros cable landing [S6] |
| 25 | Therma Visayas | Cebu | 138 | 123.635129 | 10.358562 | generator | pypsa-ph | TVI coal |
| 26 | Toledo BESS | Cebu | 138 | 123.665666 | 10.345943 | bess | pypsa-ph | verify vs OSM |
| 27 | Toledo | Cebu | 138 | 123.665666 | 10.345943 | substation | pypsa-ph | shares coord with #26 (co-located BESS) |
| 28 | Amlan | Negros | 138 | 123.224812 | 9.457757 | substation | pypsa-ph | Cebu–Negros cable landing [S6] |
| 29 | Bacolod | Negros | 230 | 123.114591 | 10.676270 | substation | pypsa-ph | major load centre |
| 30 | Cadiz | Negros | 230 | 123.288247 | 10.934822 | substation | pypsa-ph | verify vs OSM |
| 31 | Calatrava | Negros | 230 | 123.460695 | 10.553562 | substation | pypsa-ph | Cebu–Negros 230 kV landing — verify |
| 32 | E.B. Magalona | Negros | 230 | 122.967281 | 10.884745 | substation | pypsa-ph | Negros–Panay landing (see fix #1) |
| 33 | Helios Solar | Negros | 230 | 123.298579 | 10.924203 | generator | pypsa-ph | solar |
| 34 | Kabankalan | Negros | 138 | 122.848185 | 10.019242 | substation | pypsa-ph | verify vs OSM |
| 35 | Kabankalan BESS | Negros | 138 | 122.851692 | 10.019979 | bess | pypsa-ph | verify vs OSM |
| 36 | Mabinay | Negros | 138 | 122.925526 | 9.729627 | substation | pypsa-ph | verify vs OSM |
| 37 | Palinpinon 1 | Negros | 138 | 123.177466 | 9.296893 | generator | pypsa-ph | geothermal |
| 38 | Palinpinon 2 | Negros | 138 | 123.156892 | 9.280817 | generator | pypsa-ph | geothermal |
| 39 | San Carlos | Negros | 138 | 123.433566 | 10.515805 | substation | pypsa-ph | verify vs OSM |
| 40 | Corella | Bohol | 138 | 123.959325 | 9.699520 | substation | pypsa-ph | Bohol load centre |
| 41 | Tapal | Bohol | 138 | 124.519576 | 10.060901 | substation | pypsa-ph | verify vs OSM |
| 42 | Ubay | Bohol | 138 | 124.511428 | 10.026670 | substation | pypsa-ph | Leyte–Bohol cable landing |
| 43 | Bantap | Panay | 69 | 122.582826 | 10.728734 | substation | pypsa-ph | Panay–Guimaras 69 kV landing |
| 44 | Barotac Viejo | Panay | 138 | 122.870264 | 11.032835 | substation | pypsa-ph | Negros–Panay landing (see fix #1) |
| 45 | Buenavista (Guimaras) | Guimaras | 138 | 122.659216 | 10.717583 | substation | pypsa-ph | check v_nom vs 69 kV cable |
| 46 | Concepcion | Panay | 138 | 123.121373 | 11.189132 | substation | pypsa-ph | coal |
| 47 | Dingle | Panay | 138 | 122.630830 | 11.024534 | substation | pypsa-ph | Panay hub |
| 48 | Iloilo (PEDC) | Panay | 138 | 122.592428 | 10.715850 | substation | pypsa-ph | PEDC coal; major load |
| 49 | Nabas | Panay | 138 | 122.095481 | 11.814408 | substation | pypsa-ph | NW Panay wind |
| 50 | Panitan | Panay | 138 | 122.792620 | 11.494011 | substation | pypsa-ph | verify vs OSM |
| 51 | San Jose | Panay | 138 | 122.536261 | 10.998180 | substation | pypsa-ph | Antique/Iloilo — verify |
| 52 | Sta. Barbara | Panay | 138 | 122.558810 | 10.834803 | substation | pypsa-ph | Iloilo hub |

## Line provenance policy

- **Topology** (`from_bus`, `to_bus`, `voltage_kv`, `is_submarine`): target
  `sourced` against S1/S5/S6/S7. Submarine flags reconciled above.
- **`length_km`**: haversine of endpoint coords — derived; valid once coords are
  verified [S5].
- **`r_ohm_per_km` / `x_ohm_per_km`**: `estimate` — standard ACSR (overhead) and
  630 mm² XLPE (submarine) per voltage level. NGCP does not publish per-line
  impedances, so these stay estimates (and several inherited values are
  anomalous — see fix #4).
- **`max_i_ka`**: from PyPSA-PH `s_nom`; verify against published circuit
  ratings where available (CNP 400 MW, CBIP 1,200 MW) [S6/S7].

## Changelog

- **2026-05-24** — Fixes #1 and #3 applied upstream and `process_temp.py`
  re-run. Diff vs. prior generated CSVs: (a) `L_Barotac_Viejo_EB_Magalona_230`
  → `submarine_xlpe` (submarine count 5→6); (b) Daan Lungsod coordinate
  → 10.387158, 123.641023; (c) `L_Magdugo_Daan_Lungsod_138` length recomputed
  94.5→5.3 km (which exposed the anomalous inherited impedance, now logged under
  fix #4). `generators.csv` unchanged. `build_data.py` / geojson not yet
  regenerated — pending redeploy.

## Next actions (subsequent blocks this week)

1. Re-run `build_data.py`, confirm the topology gate passes, regenerate the
   geojson, and redeploy (carry tonight's CSV fixes through to the live map).
2. Add the Cebu–Bohol (CBIP) 230 kV interconnection (fix #2).
3. Recompute anomalous impedances from conductor tables (fix #4 — now includes
   `L_Magdugo_Daan_Lungsod_138`).
4. Spot-verify ~10 highest-load substation coordinates against OpenInfraMap [S5].
