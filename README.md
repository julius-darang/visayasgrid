# VisayasGrid

An interactive map and offline power-flow model of the Philippine Visayas transmission grid. Python prepares the network and solves it with pandapower; React and Leaflet display committed GeoJSON on a static website. There is no application backend or live telemetry feed.

[Live app](https://visayasgrid.vercel.app) · [Project story](https://juliusdarang.com/proj/visayasgrid.html) · [Documentation](docs/README.md)

The checked-in network contains **54 buses, 60 line features, 7 submarine connections and 115 generator units**. These are model records, not a complete inventory of today's grid. Several circuits are aggregated into one line feature; generator units are aggregated onto buses for simulation and display.

## Run the app

From this repository's root, with Node.js 22.12+ (or another version satisfying the installed Vite engine requirement) and npm:

```sh
cd web
npm ci
npm run dev
```

Open the local URL printed by Vite. Committed datasets are sufficient; Python is only needed when changing the model. See [web setup](web/README.md) for basemap configuration.

```sh
# From web/
npm test
npm run lint
npm run build
npm run preview
```

## Find your way around

| If you want to… | Read |
|---|---|
| Understand the pipeline and frontend | [Architecture](docs/architecture.md) |
| Run, rebuild, verify or deploy | [Development guide](docs/development.md) |
| Understand fields, scenarios and source ownership | [Data guide](data/README.md) |
| Check evidence behind a value | [Source and provenance ledger](data/SOURCES.md) |
| Understand limitations and unresolved issues | [Repository assessment](docs/assessment.md) |
| Continue the planned improvements | [STATUS.md](STATUS.md), then [PLAN.md](PLAN.md) Phases 7–9 |
| Learn why earlier changes were made | [Implementation journals](docs/README.md#implementation-journals) |

`STATUS.md` owns current project status; `PLAN.md` contains the roadmap and historical planning assumptions. The guides describe implemented behavior. Implementation journals and `archive/` are historical references.

## How it works

```text
Raw CSVs + source ledger + modeling constants
                 │ scripts/process_temp.py
                 ▼
Clean buses / lines / generators + demand / dispatch scenarios
                 │ scripts/build_data.py
                 ▼
Committed GeoJSON + manifest for each scenario
                 │ HTTP fetch
                 ▼
React state → filters → Leaflet map / table / inspection panels
```

The default dataset requests AC power flow at peak demand. Mean and off-peak AC datasets and a separate DC dataset are also checked in. The manifest records the solver that actually succeeded; an AC request can fall back to DC. The DC build uses base CSV demand and dispatch, so comparing it with AC peak changes both the inputs and the model.

## Interpreting the model

Values combine inherited PyPSA-PH data, individually sourced corrections and estimates. Preserve the `sourced`, `pypsa-ph` and `estimate` distinctions in [SOURCES.md](data/SOURCES.md). Lines are drawn between endpoints, not along surveyed routes. Demand scenarios come from a historical time series; dispatch is estimated. The Ormoc external-grid injection is a proxy for interchange, without a controlled or capacity-constrained HVDC model.

A converged result is a solution to these assumptions, not evidence of present operating conditions. `generated_at` is a build timestamp, not the observation date. See the [data guide](data/README.md) before interpreting voltages, loading or interchange.
