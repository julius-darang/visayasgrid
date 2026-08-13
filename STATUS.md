---
name: visayasgrid
description: Visayas grid transmission viz — source-verified data, live on Vercel
domain: engineering
status: active
stack: React+Vite · Leaflet · static JSON · pandas build
entry: web/ (npm run dev) · deploy Vercel
has_repo: true
updated: 2026-07-31
---

# visayasgrid

## State
Phases 0–6 done; production live at visayasgrid.vercel.app. Source-verified
54 buses / 60 lines / 7 submarine connections, per-field `SOURCES.md` provenance.
A React + Vite + Leaflet app (not "static JSON + Leaflet, no backend" as older docs claim).

## Next action
Phase 7 — add 69 kV sub-transmission layer (week 1), starting with the Bantap
deferred re-search. Phase 8 (missing generators) and Phase 9 (network reconciliation)
follow.

## Conventions
- `.pi/skills/grid-data-provenance/` — per-field `SOURCES.md` tags (sourced/pypsa-ph/estimate); source-first, never fabricate.

## Pointers
- PLAN: `PLAN.md` (Phases 7–9 scoped). Data: `data/{buses,lines,generators,SOURCES}.csv`.
- Build: `scripts/` (topology gate → pandapower → JSON → `web/public/data/`).
- Live: https://visayasgrid.vercel.app · own `.git` at this path.