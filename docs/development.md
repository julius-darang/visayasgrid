# Development and operations

Run commands from the repository root unless a block says otherwise. Each workspace project owns its dependencies; use this repo's `web/` and `.venv/`.

## Frontend-only changes

```sh
cd web
npm ci
npm run dev
```

Vite 8's locked package declares Node `^20.19.0 || >=22.12.0`. Use Node 22.12+ or a compatible newer version. Python and regenerated grid data are unnecessary for UI edits.

Before finishing a change, run `npm test`, `npm run lint` and `npm run build` from `web/`. Vitest currently uses a Node environment and covers pure frontend helpers; it does not establish browser accessibility or electrical-model validity.

For a browser smoke check, inspect the map in both themes and a narrow viewport; open and close filters, search for Ormoc, inspect a line, open the table, switch scenarios, and reload a shared filtered view. Check that provider attribution remains visible and requests for all three scenario files succeed. See [web/README.md](../web/README.md) for the basemap setup.

## Python environment

The DC workflow uses Python 3.11. Create an isolated environment and install the requirements:

```sh
python3.11 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
```

Requirements have lower bounds rather than a lockfile. Record Python, pandas and pandapower versions when comparing rebuilt results; package upgrades can change solver behavior. The documentation audit used the existing local environment, Python 3.14.3 / pandas 2.3.3 / pandapower 3.4.0, for CSV preparation only.

## Choose the rebuild you need

| Change | Action |
|---|---|
| UI, copy or styles | Frontend checks/build only |
| Bus identity, source coordinates, line parameters, feeder loads or dispatch factors | Update upstream input/constants and provenance, then full preparation |
| Demand time series or scenario dispatch factors only | Snapshot-only preparation, then rebuild affected outputs |
| Solver settings or transformer defaults | Rebuild affected GeoJSON from existing clean CSVs |

```sh
# Full preparation: overwrites five clean/scenario CSVs
.venv/bin/python scripts/process_temp.py

# Alternative: preserve clean buses/lines/generators, regenerate scenarios
.venv/bin/python scripts/process_temp.py --only-snapshots

# Generate all published dataset directories
.venv/bin/python scripts/build_data.py --scenario peak
.venv/bin/python scripts/build_data.py --scenario mean
.venv/bin/python scripts/build_data.py --scenario offpeak
.venv/bin/python scripts/build_data.py --mode dc
```

Do not run both preparation alternatives by habit. Full preparation already regenerates scenarios. A default `build_data.py` invocation updates only the root peak dataset; it does not refresh mean, off-peak or DC.

The historical OSM scripts in `archive/osm-pipeline/` are not part of this workflow. Existing source corrections live in `data/temp/` and `scripts/constants.py`; use [data/README.md](../data/README.md) to find the correct edit location. Never invent a source or upgrade an estimate to `sourced` merely because the build succeeds.

## Verify a data change

1. Review `git diff` before rebuilding so existing work is distinguishable from generated changes.
2. Check bus names are unique, each line endpoint resolves, and exactly one intended slack is present.
3. Read the preparation warnings, disconnected-bus report, actual solver mode and HVDC warning. Solver failure can still emit files; a zero exit status is insufficient.
4. Inspect each generated manifest and its matching bus/line files. Compare counts, demand, dispatch, disconnected features and result fields. Preserve missing results as missing, not zero.
5. Run the frontend checks and inspect the affected network/scenarios in the browser.
6. Review and commit only the intended input, provenance and generated changes together.

To investigate reproducibility without overwriting the checkout, copy `scripts/` and `data/` to a temporary directory and run the repo's Python interpreter on that copy's scripts. Paths resolve from the script location.

## Deployment

The existing project is documented as Vercel-connected. Expected configuration: **root directory `web`**, build command `npm run build`, output directory `dist`. Check the actual Vercel project settings before changing them; they are not captured in a repo deployment configuration.

Vite copies `web/public/data/` into `dist/data/`. A frontend deployment does not run pandapower. Build and review generated datasets locally before publishing changes. Vite environment variables are substituted at build time, so basemap configuration changes require a rebuild/redeploy.

The workflow [.github/workflows/build-dc-dataset.yml](../.github/workflows/build-dc-dataset.yml) runs on matching pushes to `main` and manual dispatch. It installs Python dependencies, runs **only** `build_data.py --mode dc` against committed clean CSVs, and commits `web/public/data/dc/`. It neither regenerates clean CSVs nor validates/builds the frontend or AC snapshots.

## Troubleshooting

| Symptom | Check |
|---|---|
| `vitest: command not found` | Run `npm ci` inside `web/`; check registry/network errors if installation fails |
| Vite engine/native-module failure | Use a compatible Node version and reinstall with `npm ci` |
| CARTO API-key watermark | Configure the optional key or use the default OSM provider; see web setup |
| Empty or old map after a scenario change | Inspect the three `/data/...` responses and matching manifests; see known fetch/selection issues in the assessment |
| Missing optional scenario | Its manifest HEAD request must succeed; build the complete dataset directory |
| Unexpected DC result in an AC directory | AC can fail and fall back; inspect `power_flow_mode` and build logs |
| Unchanged sidebar numbers after changing files | Rebuild the correct scenario, then verify which dataset the browser fetched |
