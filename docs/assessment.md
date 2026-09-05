# Repository legibility assessment

Reviewed 2026-09-05 against local source, prepared CSVs, committed manifests, existing docs and the personal-site project explainer. Scores are a qualitative maintainer assessment, not a measured quality index or a power-system validation.

## Rating before this pass: 6/10

| Area | Score | Evidence |
|---|---:|---|
| Orientation/onboarding | 5/10 | No root README; setup split across web/data/docs; roadmap mixes historical scope with current plans |
| Code organization | 8/10 | Clear offline/browser boundary; named components; pure style, selector and URL helpers; two readable pipeline scripts |
| Data traceability | 7/10 | Source ledger and estimate tags are valuable; later corrections coexist with stale findings; constants not entirely centralized |
| Documentation accuracy | 4/10 | Data guide said DC-only; architecture omitted demand/dispatch scenarios and incorrectly claimed hash-based scenario selection |
| Verification/maintenance | 6/10 | Helper tests and a DC workflow exist; no locked Python environment or comprehensive pipeline/UI tests; one baseline test was stale |

The main legibility cost is deciding which description to trust. A contributor can find the code, but must infer what to regenerate, which inputs a scenario uses, and which claims are historical. After the new entry point and reconciled guides, I would rate documentation/navigation around **8/10**; outstanding correctness and reproducibility issues still limit the repository as a whole.

## Changes in this pass

- Added a root README and a development/runbook guide.
- Rewrote the architecture and data guides against actual code, with scenario behavior, data contracts and modeling limits.
- Organized current guides separately from historical implementation journals and roadmap assumptions.
- Documented optional CARTO key configuration and made key-free OpenStreetMap the default when no key is configured.
- Added provider-selection regression tests and corrected the stale radius test to explicitly enable generation scaling.

The existing local change in `STATUS.md` is preserved. Planned Phases 7–9 and numerical datasets are unchanged. The blog was read as the public explanation; it was not rewritten in this pass.

## Findings to address next

These are separate from the existing planned network expansion. They remain open unless marked resolved below.

| Priority | Finding | Evidence / consequence |
|---|---|---|
| Resolved locally | Unauthenticated CARTO URLs | `MapView` previously always requested CARTO without a key. It now uses OSM by default or CARTO with a configured public key. Deployment still required. |
| High | Published scenarios are stale relative to current inputs | Mean/off-peak manifest generation totals differ from current `gen_scenarios.csv`; DC differs from current base bus dispatch. See data guide's recorded snapshot table. |
| High | Dataset HTTP errors silently look like empty data | `useGridData.js` converts non-OK fetch responses to empty collections/null instead of exposing Retry. |
| High | Scenario switch can leave stale inspection data | `App.jsx` stores a feature object and doesn't resolve/clear it on scenario changes; hook does not reset loading/error at each scenario fetch. |
| Medium | Island filters do not filter current line records | `lines.csv` has no island field and `filterFeatures` passes missing island properties. All lines survive island-only filtering. |
| Medium | Shared views lose scenario and empty filters | `viewState.js` contains no scenario field; empty `islands=`/`kv=` values decode to all. |
| Medium | Selected lines use endpoint pairs | URL restore and highlight keys omit `line_id`/voltage, creating ambiguity when multiple line records share endpoints. |
| Medium | Storage failures can prevent rendering | `useTheme` and hint access in `App` call localStorage without the catches used by `usePersistentState`. |
| Medium | Generated JSON may contain non-standard solver NaNs | Export normalization cleans input properties, but directly converted solver result floats can remain NaN. |
| Medium | Model constraints are weaker than explanatory copy suggests | Q-limit enforcement is not explicitly enabled; HVDC rating is only a warning; the slack is a proxy rather than a controlled converter model. |
| Medium | About/blog claims need reconciliation | About still describes feeder-based demand and fixed historical figures; the blog's claims about all constants living in one file and cable standards overstate what source inspection alone establishes. |

For the blog, retain the short problem → approach → result structure. Update its wording to distinguish source-backed corrections from engineering assumptions, acknowledge historical demand scenarios, and link to the repo data guide. Do not expand it into the developer manual.

## Verification evidence

- Before edits: 27 of 28 helper tests passed. The failure expected `radiusForBus` to scale generation without passing its explicit opt-in flag; the current implementation and V1 journal describe opt-in sizing.
- After the basemap/test changes: **34 tests passed**, ESLint passed, production Vite build passed.
- Ran full `process_temp.py` in an isolated copy using the existing Python environment. All five generated CSV tables exactly matched committed row values, with 54 buses / 60 lines / 115 units.
- Did not rerun AC/DC solvers or replace published datasets. CSV reproducibility does not establish reproducibility of the older numerical outputs.
- CARTO URL/key/attribution selection is unit-tested with a dummy key. No live CARTO key was obtained, submitted or validated.

- Browser smoke check: local OSM tiles and grid layers rendered without a CARTO watermark in both UI themes. Optional scenario names appeared in the selector. This was not a full mobile/accessibility audit.
- Local links in the seven current guides resolved; all eight committed GeoJSON files parsed as strict JSON. `git diff --check` passed.
