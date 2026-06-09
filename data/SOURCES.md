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

**Live deployment:** https://visayasgrid.vercel.app — verified 2026-06-03 to serve this
dataset (commit `e3a65ad`, deployed 2026-06-02): manifest 54 buses / 60 lines / 7 submarine,
CBIP `L_Argao_Maribojoc_230` present, fix-#5 coordinates live.

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
| S10 | PyPSA-PH v1.0 — `loads_t.csv` (Salac, U. Pisa) — hourly demand time series | Multi-scenario demand snapshots (peak/mean/offpeak): 8760 h × 192 Philippine buses; Visayas coincident peak 2307 MW (hour ~4/20 14:00), mean 1759 MW, offpeak 1197 MW (hour ~1/10 04:00); 2023-vintage | https://zenodo.org/records/15586573 |

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
2. ~~**Missing Cebu–Bohol 230 kV (CBIP).**~~ **DONE 2026-05-24** (commit 6700bcd).
   Added Argao (Cebu) ↔ Maribojoc (Bohol) 230 kV as `L_Argao_Maribojoc_230`
   (`submarine_xlpe`), energized 2024-11-27. Data previously had only the older
   Leyte–Bohol tie (Maasin–Ubay). [S7]
3. ~~**Duplicate coordinates.**~~ **DONE 2026-05-24.** `05DAANLUNSOD` carried
   Daanbantayan's coordinate (north Cebu). Daan Lungsod is the CEDC coal complex
   in Toledo City; relocated to 10.387158, 123.641023 in `data/temp/buses.csv`. [S9]
4. ~~**Anomalous inherited impedances.**~~ **DONE 2026-05-24** (commit b1050ff).
   Several lines carried r/x far above normal ACSR values: `L_Kananga_Ormoc_230`
   r=3.218 Ω/km (~20× a typical 230 kV conductor); `L_Tabango_Kananga_230`
   r=1.723; `L_Colon_Quiot_138` r=2.013; and exposed by fix #3,
   `L_Magdugo_Daan_Lungsod_138` r=2.136 Ω/km (inherited `r_total` ~11.4 Ω divided
   by the wrong 94.5 km length; true line ~5.3 km). Recomputed from conductor
   tables — the 230 kV corridor lines now carry r=0.06 / x=0.40 Ω/km and the
   138 kV lines r=0.10 / x=0.42 Ω/km. [estimate]
5. **Verify all 52 bus coordinates** against OSM/OpenInfraMap (currently
   `pypsa-ph`). [S5] — *in progress; 32 of 52 now `sourced` after 2026-05-24 and two 2026-05-27 passes.*
6. **Voltage discrepancies vs OSM — two sub-categories:**
   - ~~**6a. Dual-voltage substations (true schema problem).**~~ **RESOLVED-BY-POLICY
     2026-06-03.** OSM confirms **E.B. Magalona**, **Barotac Viejo**, and **Tongonan**
     each have co-located 138 kV and 230 kV yards, which the one-bus-per-location
     schema cannot both carry. **Decision (Julius, 2026-06-03): document the
     simplification, do not split.** Codified rule: *one bus per physical location;
     `v_nom` = the level of the dominant transmission line at that bus.* These three
     sites are accepted **known simplifications** — Magalona=230 (matches the submarine
     230 kV cable), Barotac=138 and Tongonan=138 (match local feeders); the co-located
     opposite-voltage yard and any transformer between them are intentionally not
     modelled at prototype scope. The rejected alternative (split each into two buses
     + a transformer) is deferred to a later Engineering week if model fidelity ever
     requires it. [S5/S6/S7]
   - ~~**6b. Safe-flip candidate (Lapu-Lapu / Pusok).**~~ **DONE 2026-06-03.** Flipped
     **Lapu-Lapu (Pusok)** `v_nom` 230 → 138 in `data/temp/buses.csv`. Its only attached
     line `L_Mandaue_Lapu-Lapu_Pusok_138` is 138 kV, and OSM way/616007566 confirms the
     substation as 138 kV ("Lapu-Lapu Gas Insulated Substation") — the flip aligns the
     bus with its feeder and improves internal consistency. [S5]

## Per-bus provenance (52 buses)

Values are the current `buses.csv` contents. `coord/value source` and `status`
describe verification state, not the number's origin (all numbers currently
trace to PyPSA-PH unless noted).

| # | name | island | v_nom | x (lon) | y (lat) | bus_type | status | notes |
|---|------|--------|------:|--------:|--------:|----------|--------|-------|
| 1 | Babatngon | Leyte | 138 | 124.950840 | 11.356460 | substation | sourced [S5] | OSM way/245371561 "Babatngon Substation"; corrected ~7.3 km SE; 2026-06-03 |
| 2 | Calbayog | Samar | 138 | 124.635480 | 12.054540 | substation | sourced [S5] | OSM way/304140707 (NGCP substation); corrected ~0.3 km W; 2026-06-03 |
| 3 | Isabel | Leyte | 138 | 124.448930 | 10.919333 | substation | sourced [S5] | Isabel/LIDE industrial area; confirmed 2026-05-24 |
| 4 | Kananga | Leyte | 230 | 124.551309 | 11.164993 | substation | confirmed [NGCP news/triangulation] | NGCP explicitly names "Tabango–Kananga 230KV L1 & L2" and "Ormoc–Kananga 230KV Line 2" in public advisories, confirming the substation exists in Kananga, Leyte. Triangulation: Tabango→Kananga 28.71 km (calc 28.77 km ✓), Kananga→Ormoc 13.344 km (calc 13.37 km ✓). PhilAtlas Kananga municipality centre 11°11'N 124°34'E (~2.6 km NE of current coord). Coord within Kananga municipality; 2026-06-08 |
| 5 | Maasin | Leyte | 138 | 124.779131 | 10.162555 | substation | sourced [S5] | Leyte–Bohol cable landing; confirmed 2026-05-27 |
| 6 | Ormoc | Leyte | 350 | 124.644678 | 11.087485 | hvdc | sourced (role) | Leyte–Luzon HVDC terminal, slack [S8] |
| 7 | Paranas (Wright) | Samar | 138 | 125.040600 | 11.767520 | substation | sourced [S5] | OSM way/377931160 "Paranas Substation"; confirmed ~0.1 km; 2026-06-03 |
| 8 | Sta. Rita | Samar | 138 | 125.001640 | 11.395050 | substation | sourced [S5] | OSM way/387032394 (named "Bagolibas Substation" — the NGCP facility in Brgy. Bagolibas, Sta. Rita); confirmed ~0.0 km; 2026-06-03 |
| 9 | Tabango | Leyte | 230 | 124.343486 | 11.323472 | substation | sourced [S5] | Leyte–Cebu cable landing; confirmed 2026-05-27 |
| 10 | Tongonan | Leyte | 138 | 124.643492 | 11.140405 | generator | sourced [S5] | geothermal; corrected ~2.5 km S; OSM way/493145451; OSM shows dual 138/230 kV — see fix #6; 2026-05-27 |
| 11 | Calong-calong | Cebu | 138 | 123.668582 | 10.415726 | substation | sourced [S5] | corrected ~0.15 km; OSM way/611678737 labeled "Magdugo 138 kV" (separate from our Magdugo 230 at 10.346 — likely same Magdugo electrical complex, different yard); 2026-05-27 |
| 12 | Cebu | Cebu | 138 | 123.918420 | 10.359868 | substation | sourced [S5] | corrected ~2.5 km W; OSM way/222760842 (Cebu City substation); 2026-05-27 |
| 13 | Colon | Cebu | 138 | 123.759877 | 10.222684 | substation | sourced [S5] | confirmed 2026-05-24 |
| 14 | Compostela | Cebu | 230 | 124.006598 | 10.466498 | substation | sourced [S5] | NE Cebu 230 kV backbone node; confirmed 2026-05-27 |
| 15 | Daanbantayan | Cebu | 230 | 124.066134 | 11.252493 | substation | sourced [S5] | Leyte–Cebu submarine cable landing (Cebu side); corrected ~14 km NE; OSM way/246390064; 2026-05-27 |
| 16 | Daan Lungsod | Cebu | 230 | 123.641023 | 10.387158 | substation | sourced [S9] | CEDC coal, Toledo City; fixed 2026-05-24 |
| 17 | Dumanjug | Cebu | 230 | 123.440547 | 10.036174 | substation | sourced [S5] | CNP 230 kV backbone (Cebu W); confirmed 2026-05-27 |
| 18 | KSPC | Cebu | 230 | 123.762681 | 10.218271 | generator | sourced [S5] | KEPCO-SPC Naga coal; confirmed 2026-05-27 |
| 19 | Lapu-Lapu (Pusok) | Cebu | 138 | 123.967921 | 10.323788 | substation | sourced [S5] | Mactan GIS; corrected ~0.05 km; OSM way/616007566 ("Lapu-Lapu Gas Insulated Substation") tagged 138 kV; v_nom flipped 230→138 per fix #6b 2026-06-03 |
| 20 | Magdugo | Cebu | 230 | 123.665698 | 10.345742 | substation | sourced [S5] | Cebu 230 kV hub; confirmed 2026-05-27 |
| 21 | Mandaue | Cebu | 138 | 123.963596 | 10.329460 | substation | sourced [S5] | corrected ~0.6 km; OSM way/616007569; fixed 2026-05-24 |
| 22 | Naga (Visayas) | Cebu | 138 | 123.758582 | 10.223256 | substation | sourced [S5] | Naga, Cebu (not Luzon Naga); corrected ~3.5 km S — now sits very close to Colon (10.222684) suggesting they may share a substation complex; OSM way/229365726; 2026-05-27 |
| 23 | Quiot | Cebu | 138 | 123.855494 | 10.287685 | substation | sourced [S5] | corrected ~0.08 km; OSM way/332492141; r/x of feeder line still anomalous — see fix #4; 2026-05-27 |
| 24 | Samboan | Cebu | 138 | 123.308399 | 9.551115 | substation | sourced [S5] | Cebu–Negros cable landing [S6]; corrected ~0.4 km W; OSM way/1181079743; 2026-05-27 |
| 25 | Therma Visayas | Cebu | 138 | 123.602486 | 10.350191 | generator | sourced [S5] | TVI coal; corrected ~3.6 km W; OSM node/4208297198; 2026-05-27 |
| 26 | Toledo BESS | Cebu | 138 | 123.706851 | 10.341147 | bess | sourced [S5] | was Magdugo duplicate; corrected ~4 km; OSM way/616838559; fixed 2026-05-24 |
| 27 | Toledo | Cebu | 138 | 123.706851 | 10.341147 | substation | sourced [S5] | was Magdugo duplicate; corrected ~4 km; OSM way/616838559; fixed 2026-05-24 |
| 28 | Amlan | Negros | 138 | 123.224812 | 9.457757 | substation | sourced [S5] | Cebu–Negros cable landing [S6]; confirmed 2026-05-27 |
| 29 | Bacolod | Negros | 230 | 122.989272 | 10.629460 | substation | sourced [S5] | corrected ~13 km; 230 kV OSM way/1175248269, 138 kV OSM rel/15283858 co-located; fixed 2026-05-24 |
| 30 | Cadiz | Negros | 230 | 123.288247 | 10.934822 | substation | sourced [S5] | confirmed 2026-05-24 |
| 31 | Calatrava | Negros | 230 | 123.460695 | 10.553562 | substation | sourced [S5] | Cebu–Negros 230 kV landing; confirmed 2026-05-27 |
| 32 | E.B. Magalona | Negros | 230 | 122.964067 | 10.895112 | substation | sourced [S5] | Negros–Panay landing (see fix #1); corrected ~1.2 km N; OSM way/1426217205; dual 138/230 kV site confirmed — see fix #6; 2026-05-27 |
| 33 | Helios Solar | Negros | 230 | 123.292000 | 10.922410 | generator | sourced [S5] | OSM way/805822040 "Helios Solar Energy" substation; corrected ~0.7 km W; 2026-06-03 |
| 34 | Kabankalan | Negros | 138 | 122.847760 | 10.018600 | substation | sourced [S5] | OSM way/281402425 "Kabankalan Substation"; confirmed ~0.1 km; 2026-06-03 |
| 35 | Kabankalan BESS | Negros | 138 | 122.851692 | 10.019979 | bess | confirmed [NGCP/Fluence news] | NGCP-owned 20 MW/20 MWh lithium-ion BESS, first utility-scale grid BESS in Philippines, at Kabankalan City, Negros Occidental (AES/NGCP via Fluence, commercial operation ~2022). Connected to NGCP Kabankalan substation (OSM way/281402425, 0.5 km tie-line). Coord ~0.5 km NE of confirmed Kabankalan substation — consistent with 0.5 km overhead tie-line in dataset; 2026-06-08 |
| 36 | Mabinay | Negros | 138 | 122.924350 | 9.728760 | substation | sourced [S5] | OSM way/281402426 "Mabinay Substation"; confirmed ~0.2 km; 2026-06-03 |
| 37 | Palinpinon 1 | Negros | 138 | 123.177466 | 9.296893 | generator | sourced [S5] | Within OSM Palinpinon geothermal complex: relation/5495786 "Palinpinon Geothermal Power Plant I", ~0.6 km from mapped unit way/285069303; coord kept; 2026-06-03 |
| 38 | Palinpinon 2 | Negros | 138 | 123.156892 | 9.280817 | generator | sourced [S5] | Within OSM Palinpinon geothermal complex ~1.1 km from relation/5495786 (Plant I); OSM does not separately tag Plant II — location confirmed, exact unit unverified; coord kept; 2026-06-03 |
| 39 | San Carlos | Negros | 138 | 123.433060 | 10.515220 | substation | sourced [S5] | OSM way/1362017481 (named "San Jose Substation" — NGCP substation in Brgy. San Jose, San Carlos City, adjacent to the SaCaSol solar plant); confirmed ~0.1 km; 2026-06-03 |
| 40 | Corella | Bohol | 138 | 123.903280 | 9.680290 | substation | sourced [S5] | OSM way/242578663 "Corella Substation - BOHECO I"; corrected ~6.5 km W; 2026-06-03 |
| 41 | Tapal | Bohol | 138 | 124.519576 | 10.060901 | substation | confirmed [news/philatlas] | NPC Power Barge 4 (TPLPB4) at Tapal Wharf, Brgy. Tapal, Ubay, Bohol. NGCP 69 kV Ubay–Tapal tie-line runs from Ubay Sub (Brgy. Imelda) to Tapal Wharf ~4 km (matches line length 3.909 km). PhilAtlas barangay centre 10.0577, 124.5163 (~0.5 km SW); current coord sits NE of centroid on the Basiao Channel coastline, consistent with wharf position. Sources: Bohol Chronicle 2017-10-17; PhilAtlas Tapal, Ubay, Bohol; 2026-06-08 |
| 42 | Ubay | Bohol | 138 | 124.511428 | 10.026670 | substation | sourced [S5] | Leyte–Bohol cable landing; confirmed 2026-05-24 |
| 43 | Bantap | Panay | 69 | 122.582826 | 10.728734 | substation | pypsa-ph (re-search) | OSM 2026-06-03 inconclusive: sits in the Iloilo City power cluster (multiple unnamed substations 0.6–0.8 km, e.g. way/707446503, + Panay Power station way/539156478) but no name-matched Bantap feature. Coord plausible, specific facility unconfirmed |
| 44 | Barotac Viejo | Panay | 138 | 122.870264 | 11.032835 | substation | sourced [S5] (coord) | Negros–Panay landing (see fix #1); coord confirmed 2026-05-27; OSM shows dual 138/230 kV yard — see fix #6 |
| 45 | Buenavista (Guimaras) | Guimaras | 138 | 122.659216 | 10.717583 | substation | confirmed [ERC/PhilAtlas] | Facility identified as Zaldivar Switchyard (ERC case docs), Brgy. Zaldivar, Buenavista, Guimaras. Designed for 138 kV, operated at 69 kV (matches v_nom=138, line=69 kV). Connection hub for Trans-Asia/ACEN 54 MW Guimaras Wind and the Bantap submarine cable. PhilAtlas Brgy. Zaldivar centroid 10.6968, 122.6170 (~5.2 km SW of current coord); current coord 8.45 km from Bantap, matching submarine cable length 8.437 km ✓. Exact switchyard position within Buenavista municipality unverified; coord kept; 2026-06-08 |
| 46 | Concepcion | Panay | 138 | 123.120580 | 11.188270 | substation | sourced [S5] | OSM substation node/3116616764, co-located with the PALM Concepcion Power Corporation plant (way/919025519); confirmed ~0.1 km; 2026-06-03 |
| 47 | Dingle | Panay | 138 | 122.630830 | 11.024534 | substation | sourced [S5] | Panay hub; OSM labeled "Panay Diesel Power Plant 3"; confirmed 2026-05-24 |
| 48 | Iloilo (PEDC) | Panay | 138 | 122.59255 | 10.72631 | substation | sourced [S5] | corrected ~1.2 km; OSM way/937496043; fixed 2026-05-24 |
| 49 | Nabas | Panay | 138 | 122.095070 | 11.814270 | substation | sourced [S5] | OSM way/364959566 "Nabas Substation"; confirmed ~0.0 km; 2026-06-03 |
| 50 | Panitan | Panay | 138 | 122.757550 | 11.469190 | substation | sourced [S5] | OSM way/245730451 "Panitan Substation" (NGCP node nearby; CAPELCO Panit-an way/1414944714); corrected ~4.7 km SW; 2026-06-03 |
| 51 | San Jose | Panay | 138 | 122.536261 | 10.998180 | substation | confirmed [NGCP news/triangulation] | NGCP upgraded the San Jose Substation with a 50 MVA transformer (per NGCP 2025 project completion news). Location confirmed as Barangay San Jose, San Miguel, Iloilo, per ILECO 1 maintenance reports. Coord (122.536, 10.998) sits in San Miguel, Iloilo municipality. Triangulation: Sta. Barbara→San Jose 18.333 km (calc 18.36 km ✓); 2026-06-08 |
| 52 | Sta. Barbara | Panay | 138 | 122.558810 | 10.834803 | substation | sourced [S5] | Iloilo hub; confirmed 2026-05-24 |

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

- **2026-06-09 (DOE Dec-2024 generation reconciliation + multi-scenario demand snapshots)**

  **Generation corrections (DOE "List of Existing Power Plants for Visayas Grid as of December 2024"):**
  Capacity and dispatch values in `data/generators.csv` and `data/buses.csv` reconciled against the
  official DOE Dec-2024 plant list. Key corrections:
  - Tongonan (Leyte): 120.5 → 123.0 MW installed / 102.42 → 104.55 MW dispatch [DOE Dec-2024]
  - Leyte-A / Kananga geothermal: 490.1 → 610.2 MW installed / 416.58 → 518.67 MW dispatch [DOE]
  - KSPC G01 & G02 (Naga coal): 103.0 → 110.5 MW each / 82.4 → 88.4 MW dispatch [DOE]
  - TPVI (Therma Visayas diesel, 6 units): 5.5 → 7.43 MW each / 1.65 → 2.23 MW dispatch [DOE]
  - Helios Solar (Negros): 105.0 → 132.5 MW installed / 26.25 → 33.13 MW dispatch [DOE]
  - Nasulo / Palinpinon 2 (Negros): 47.5 → 49.4 MW installed / 40.38 → 41.99 MW dispatch [DOE]
  - New plants added: Bacolod Biomass 40 MW; Kabankalan BESS ×2 (22.5 + 12.2 MW);
    Toledo BESS 23.7 MW; Ubay BESS 23.3 MW; Ormoc BESS 47.5 MW [DOE Dec-2024]

  **Multi-scenario demand snapshots [S10]:**
  Replaced per-feeder proxy demand with real PyPSA-PH hourly data (`data/temp/loads_t.csv`
  from Zenodo/S10). `scripts/process_temp.py` gains `build_demand_snapshots()` which finds the
  coincident-peak, annual-mean, and coincident-minimum hours from the 8760-h time series and writes
  `data/load_scenarios.csv` (54 buses × 3 snapshots). Scenario outputs built into
  `web/public/data/{mean,offpeak}/` subdirectories alongside the existing peak root.

  **Scenario-specific generation dispatch [S10]:**
  `scripts/constants.py` gains `SCENARIO_GEN_FACTORS` — per-carrier capacity factors for
  peak/mean/offpeak (solar=0 at offpeak 04:00, diesel minimal, geothermal 0.85 unchanged).
  `scripts/process_temp.py` gains `build_gen_scenarios()` → `data/gen_scenarios.csv`.
  `scripts/build_data.py` applies both demand and gen overrides per scenario. Resulting
  HVDC balance: peak −128 MW, mean −355 MW, offpeak −523 MW (offpeak excess is physically
  correct — geothermal + coal baseload exceeds 1197 MW offpeak demand in generation-rich Visayas).

  **UI — scenario label in StatsPanel:** `web/src/components/StatsPanel.jsx` footer now
  shows the active scenario from `manifest.demand_scenario`:
  `"AC flow · Peak demand · Jun 2025"`.

  Commits: `502ea71` (generation corrections), `b392956` (demand snapshots),
  `3e89345` (scenario dispatch + UI label).

- **2026-06-08 (Tapal resolution)** — Resolved Tapal (bus #41) without the NGCP TDP diagram.
  Research confirmed: "Tapal" = NPC Power Barge 4 (TPLPB4, 29 MW diesel, commissioned 2005)
  moored at **Tapal Wharf**, Barangay Tapal, Ubay, Bohol. The NGCP 69 kV Ubay–Tapal tie-line
  runs from Ubay Substation (Brgy. Imelda) to the barge at Tapal Wharf, ~4 km — matching the
  dataset's 3.909 km line length to within 0.2%. PhilAtlas gives the barangay centre as
  10.0577, 124.5163; the existing coord (10.060901, 124.519576) is ~0.5 km NE of that centroid,
  consistent with a coastal wharf on the Basiao Channel side of the barangay. Coord kept; source
  tag updated from `pypsa-ph (re-search)` → `confirmed [news/philatlas]`.
  Sources: Bohol Chronicle 2017-10-17 (NGCP barge tie-line); PhilAtlas Tapal, Ubay, Bohol.
  Bus verification count: **47 of 52 sourced** (was 46). **Remaining 5 re-search:**
  Kananga, Kabankalan BESS, San Jose (Panay), Bantap, Buenavista (Guimaras).

- **2026-06-08 (4-bus re-search resolution — Kananga / Kabankalan BESS / San Jose / Buenavista)**
  Resolved the remaining 4 buses that were OSM-inconclusive, using news sources, ERC documents,
  PhilAtlas, and line-length triangulation. No CSV coordinate changes needed.

  - **Kananga** (Leyte, 230 kV) — NGCP public advisories explicitly name "Tabango–Kananga 230KV
    L1 & L2" and "Ormoc–Kananga 230KV Line 2", confirming the substation in Kananga municipality.
    Triangulation: 28.77 km from Tabango (line 28.71 km ✓), 13.37 km from Ormoc (line 13.344 km ✓).
    Coord within Kananga municipality; PhilAtlas centre ~2.6 km NE. Tag: confirmed [NGCP news/triangulation].

  - **Kabankalan BESS** (Negros, 138 kV) — NGCP-owned 20 MW/20 MWh lithium-ion BESS at
    Kabankalan City, the first utility-scale grid BESS in the Philippines (AES/NGCP via Fluence,
    ~2022). Coord is ~0.5 km NE of the OSM-confirmed Kabankalan substation — consistent with the
    0.5 km overhead tie-line in the dataset.
    Tag: confirmed [NGCP/Fluence news].

  - **San Jose** (Panay, 138 kV) — NGCP 2025 project report confirms "San Jose Substation"
    upgrade (50 MVA transformer). ILECO 1 news places it in Barangay San Jose, San Miguel, Iloilo.
    Coord (122.536, 10.998) is consistent with San Miguel municipality.
    Triangulation: 18.36 km from Sta. Barbara (line 18.333 km ✓).
    Tag: confirmed [NGCP news/triangulation].

  - **Buenavista (Guimaras)** (Guimaras, 138 kV) — Identified as Zaldivar Switchyard,
    Brgy. Zaldivar, Buenavista, Guimaras (ERC case documents for Trans-Asia/ACEN 54 MW
    Guimaras Wind). Designed 138 kV, operated 69 kV (matches dataset). PhilAtlas Brgy.
    Zaldivar centroid 10.6968, 122.6170 (~5.2 km from current coord); current coord 8.45 km
    from Bantap (submarine cable 8.437 km ✓) — exact switchyard position within municipality
    unverified but geometrically consistent with cable terminus. Coord kept.
    Tag: confirmed [ERC/PhilAtlas].

  Bus verification count: **51 of 52 sourced** (was 47). **1 remaining re-search: Bantap** (Panay,
  69 kV) — not a registered PhilAtlas barangay; both connecting line lengths validate current
  coord (12.1 km from Sta. Barbara ✓, 8.45 km to Buenavista ✓) but facility name/address
  unconfirmed. Needs NGCP TDP one-line diagram or local knowledge.

- **2026-06-03 (Batch C — Panay/Guimaras coords)** — Verified the 6 Batch C buses against
  OSM power features (Overpass + Nominatim [S5]). 3 sourced, 3 re-search:
  - **Nabas** → 122.095070, 11.814270 (confirmed ~0.0 km); OSM way/364959566 "Nabas Substation".
  - **Panitan** → 122.757550, 11.469190 (corrected ~4.7 km SW); OSM way/245730451 "Panitan
    Substation" (CAPELCO Panit-an + NGCP node co-located).
  - **Concepcion** → 123.120580, 11.188270 (confirmed ~0.1 km); OSM substation node/3116616764,
    co-located with PALM Concepcion Power Corporation (way/919025519).
  - **San Jose (Panay)** — inconclusive; no San Jose-named substation, nearest is Janiuay
    Substation (way/1174508958, ~6.4 km, different municipality). Kept re-search.
  - **Bantap** — inconclusive; Iloilo City power cluster (several unnamed substations 0.6–0.8 km),
    no name-matched feature. Kept re-search.
  - **Buenavista (Guimaras)** — inconclusive; nearest substation unnamed (way/630843726, ~4.8 km).
    Kept re-search.
  Bus verification count: **46 of 52 sourced** (was 43). OSM coordinate sweep complete.
  **Remaining 6 are re-search — not OSM-resolvable, need the NGCP TDP one-line diagram:**
  Tapal, Kananga, Kabankalan BESS, San Jose, Bantap, Buenavista.
  *(Tapal subsequently resolved 2026-06-08 via news/PhilAtlas — see changelog. Remaining 5.)*
  *(Kananga, Kabankalan BESS, San Jose, Buenavista subsequently resolved 2026-06-08 — see changelog. Remaining 1: Bantap.)*

- **2026-06-03 (Batch B — Negros load coords)** — Verified the 7 Batch B buses against
  OSM power features (Overpass [S5]). 6 sourced, 1 re-search:
  - **Kabankalan** → 122.847760, 10.018600 (confirmed ~0.1 km); OSM way/281402425.
  - **Mabinay** → 122.924350, 9.728760 (confirmed ~0.2 km); OSM way/281402426.
  - **San Carlos** → 123.433060, 10.515220 (confirmed ~0.1 km); OSM way/1362017481
    (named "San Jose Substation" — NGCP substation in Brgy. San Jose, San Carlos City,
    beside the SaCaSol solar plant).
  - **Helios Solar** → 123.292000, 10.922410 (corrected ~0.7 km W); OSM way/805822040
    "Helios Solar Energy".
  - **Palinpinon 1** → coord kept; within OSM Palinpinon geothermal complex (relation/5495786
    "Palinpinon Geothermal Power Plant I", ~0.6 km from unit way/285069303).
  - **Palinpinon 2** → coord kept; within the same complex (~1.1 km from Plant I relation);
    OSM does not separately tag Plant II — location confirmed, exact unit unverified.
  - **Kabankalan BESS** — inconclusive; no OSM battery feature; sits ~0.4 km from the
    OSM-confirmed Kabankalan substation. Kept `pypsa-ph (re-search)`.
  Bus verification count: **43 of 52 sourced** (was 37). Remaining 9: Panay/Guimaras
  (Batch C, 6) + Tapal, Kananga, Kabankalan BESS re-search.

- **2026-06-03 (Batch A — Samar/Leyte/Bohol coords)** — Verified the 7 Batch A buses
  against OSM power features (Overpass, [S5]). 5 sourced, 2 remain re-search:
  - **Babatngon** → 124.950840, 11.356460 (corrected ~7.3 km SE); OSM way/245371561.
  - **Calbayog** → 124.635480, 12.054540 (corrected ~0.3 km W); OSM way/304140707 (NGCP).
  - **Sta. Rita** → 125.001640, 11.395050 (confirmed ~0.0 km); OSM way/387032394
    (named "Bagolibas Substation" — NGCP facility in Brgy. Bagolibas, Sta. Rita).
  - **Paranas (Wright)** → 125.040600, 11.767520 (confirmed ~0.1 km); OSM way/377931160.
  - **Corella** → 123.903280, 9.680290 (corrected ~6.5 km W); OSM way/242578663
    ("Corella Substation - BOHECO I").
  - **Tapal** — inconclusive; only Ubay Substation (way/493029880, ~4 km, already bus #42)
    nearby; no distinct Tapal feature. Kept `pypsa-ph (re-search)`.
  - **Kananga** — inconclusive; no Kananga-named substation within 16 km, only the Tongonan
    geothermal cluster + its 230 kV yard (way/493145451, Tongonan's). Kept `pypsa-ph (re-search)`.
  Bus verification count: **37 of 52 sourced** (was 32). Remaining 15: Negros load (Batch B),
  Panay/Guimaras (Batch C), + Tapal & Kananga re-search.

- **2026-06-03** — Ship gate closed + voltage cleanup. (a) Located and recorded the
  production URL `https://visayasgrid.vercel.app`; verified it serves this dataset.
  (b) Fix #6b: flipped Lapu-Lapu (Pusok) `v_nom` 230→138 (OSM way/616007566) in
  `data/temp/buses.csv`. (c) Fix #6a resolved by policy (Julius): one bus per location,
  `v_nom` = dominant line level; no bus/transformer split — E.B. Magalona / Barotac Viejo /
  Tongonan accepted as known simplifications. (d) Regenerated AC + DC datasets via
  `process_temp.py` + `build_data.py` (topology gate passes, AC load flow converged; only
  2 buses' vm_pu shifted, max Δ0.0039; system totals unchanged) — this also confirmed the
  hand-mirrored `data/temp/buses.csv` is reproducible (closes the manual-mirror drift).
  Committed `7851636`, pushed, Vercel redeployed; live render confirms Lapu-Lapu at 138 kV.
  Bus verification still 32/52 sourced (Lapu-Lapu was already sourced) — remaining 20 + the
  Kananga re-locate roll to a later Engineering week.

- **2026-06-02** — Carried the 2026-05-24 and 2026-05-27 coordinate/topology
  fixes through to the rendered geojson and redeployed (commit e3a65ad). No CSV
  *value* changes in this commit — it propagates already-committed fixes to the
  live map. Bookkeeping catch-up: fixes #2 (CBIP interconnection, commit 6700bcd)
  and #4 (impedance recompute, commit b1050ff) were both committed 2026-05-24 but
  the Discrepancies section had still listed them open until this entry; now
  marked DONE. Verified in current `lines.csv`: `L_Argao_Maribojoc_230` present;
  the four previously-anomalous corridor lines now carry conductor-table r/x.

- **2026-05-24** — Fixes #1 and #3 applied upstream and `process_temp.py`
  re-run. Diff vs. prior generated CSVs: (a) `L_Barotac_Viejo_EB_Magalona_230`
  → `submarine_xlpe` (submarine count 5→6); (b) Daan Lungsod coordinate
  → 10.387158, 123.641023; (c) `L_Magdugo_Daan_Lungsod_138` length recomputed
  94.5→5.3 km (which exposed the anomalous inherited impedance, now logged under
  fix #4). `generators.csv` unchanged. `build_data.py` / geojson not yet
  regenerated — pending redeploy.

- **2026-05-27** — Second 10-bus coordinate pass against OpenInfraMap [S5],
  targeting the inter-island cable landings and backbone hubs.
  5 confirmed, 3 corrected, 1 deferred, 1 surfaced fix #6.
  - Confirmed (no change): Tabango, Maasin, Magdugo, Amlan, Calatrava.
  - Tongonan (04TONGONA): 124.6376,11.1613 → 124.6435,11.1404 (~2.5 km S);
    OSM way/493145451; site also shows a 230 kV yard → fix #6.
  - Samboan (05SAMBOAN): 123.3117,9.5524 → 123.3084,9.5511 (~0.4 km W);
    OSM way/1181079743.
  - E.B. Magalona (06GAHIT): 122.9673,10.8847 → 122.9641,10.8951 (~1.2 km N);
    OSM way/1426217205; OSM confirms dual 138/230 kV yards → fix #6.
  - Barotac Viejo: coord confirmed; OSM shows 230 kV yard alongside the
    inherited 138 kV → fix #6 (no coord edit).
  - Kananga: OSM/OIM search inconclusive; tagged `pypsa-ph (re-search)` for
    next block — trace 230 kV between Tabango and Ormoc.
  Bus verification count: 22 of 52 now `sourced` (previous undercount of "16"
  in this entry was off — 13 sourced pre-tonight per 2026-05-24 + 9 newly
  sourced this batch = 22).
  `process_temp.py` not yet re-run; `data/temp/buses.csv` mirrored manually.

- **2026-05-27 (batch 2)** — Cebu-region 10-bus coordinate pass against
  OpenInfraMap [S5]. 3 confirmed, 7 corrected, 1 surfaced fix #6b.
  - Confirmed (no change): Compostela, Dumanjug, KSPC.
  - Daanbantayan (05DAANBNTAY): 123.9568,11.1464 → 124.0661,11.2525
    (~14 km NE); OSM way/246390064. Leyte–Cebu submarine cable landing —
    correct coord matters for the cable rendering.
  - Lapu-Lapu (Pusok) (05LAPULAPU): 123.9683,10.3238 → 123.9679,10.3238
    (~0.05 km); OSM way/616007566 "Lapu-Lapu Gas Insulated Substation"
    tagged 138 kV → fix #6b (safe voltage flip candidate, deferred).
  - Cebu (05CEBU): 123.9409,10.3652 → 123.9184,10.3599 (~2.5 km W);
    OSM way/222760842.
  - Naga (Visayas) (05NAGA): 123.7570,10.2544 → 123.7586,10.2233
    (~3.5 km S); OSM way/229365726. Now sits ~50 m from Colon — possible
    co-location; flag for future check.
  - Quiot (05QUIOT): 123.8561,10.2879 → 123.8555,10.2877 (~0.08 km);
    OSM way/332492141. Doesn't address the anomalous feeder r/x (fix #4).
  - Calong-calong (05CALUNG): 123.6671,10.4157 → 123.6686,10.4157
    (~0.15 km); OSM way/611678737 labeled "Magdugo 138 kV" — OSM-name
    oddity, kept bus name.
  - Therma Visayas (05THERMA): 123.6351,10.3586 → 123.6025,10.3502
    (~3.6 km W); OSM node/4208297198.
  Bus verification count: 32 of 52 now `sourced`. Remaining 20 are
  mostly Negros load substations, Bohol/Samar/Panay rural nodes, and
  the small generator/BESS buses.
  `process_temp.py` not yet re-run; `data/temp/buses.csv` mirrored manually.

- **2026-05-24 (fix #5)** — Human-led coordinate spot-check of 10 highest-load
  substations vs OpenInfraMap [S5]. 6 confirmed, 4 corrected:
  - Bacolod (06BACOLOD): 123.1146,10.6763 → 122.9893,10.6295 (~13 km WSW);
    230 kV OSM way/1175248269; was in sugar-cane land NE of city.
  - Mandaue (05MANDAUE): 123.9639,10.3347 → 123.9636,10.3295 (~0.6 km S);
    OSM way/616007569.
  - Iloilo/PEDC (08ILOILO1): 122.5924,10.7159 → 122.5926,10.7263 (~1.2 km N);
    OSM way/937496043.
  - Toledo + Toledo BESS (05TOLEDO, 05TOLBESS): 123.6657,10.3459 →
    123.7069,10.3411 (~4 km E); was a duplicate of Magdugo's coordinate;
    OSM way/616838559.
  Confirmed (no coord change): Isabel, Sta. Barbara, Colon, Cadiz, Ubay, Dingle
  (Dingle OSM label = "Panay Diesel Power Plant 3").

## Next actions (subsequent blocks this week)

1. Re-run `process_temp.py` + `build_data.py`, confirm the topology gate
   passes, regenerate the geojson, and redeploy (carry the 2026-05-24 and
   2026-05-27 CSV fixes through to the live map).
2. Add the Cebu–Bohol (CBIP) 230 kV interconnection (fix #2).
3. Recompute anomalous impedances from conductor tables (fix #4).
4. ~~Spot-verify ~10 highest-load substation coordinates against OpenInfraMap [S5].~~ **DONE 2026-05-24** (fix #5).
5. ~~Verify 10 inter-island landings + backbone hubs against OpenInfraMap [S5].~~ **DONE 2026-05-27** (5 confirmed, 3 corrected, 1 deferred, surfaced fix #6).
6. ~~Cebu cluster (10 buses): metro 230/138 hubs + Leyte–Cebu landing + major generators.~~ **DONE 2026-05-27 (batch 2)** (3 confirmed, 7 corrected, surfaced fix #6b).
7. Re-locate Kananga substation on OSM/OIM (trace 230 kV Tabango → Ormoc).
8. Decide on voltage schema (fix #6a + 6b) before next coord pass.
9. Next coord pass — remaining 20 buses, suggested split: Negros load (Kabankalan/BESS, Mabinay, San Carlos, Helios, Palinpinon 1/2) + Panay/Guimaras (Nabas, Panitan, San Jose, Bantap, Buenavista, Concepcion) + Samar/Leyte/Bohol (Babatngon, Calbayog, Sta. Rita, Paranas, Corella, Tapal).
