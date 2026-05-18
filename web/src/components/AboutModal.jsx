const ISLAND_DATA = [
  { name: "Cebu",    load: "~530 MW", gen: "Coal, Geothermal, Solar, Diesel",       note: "Grid hub; densest substation concentration" },
  { name: "Leyte",   load: "~210 MW", gen: "Geothermal (dominant), Solar, Diesel",  note: "Hosts the HVDC terminus at Ormoc" },
  { name: "Negros",  load: "~330 MW", gen: "Geothermal, Biomass, Solar, Coal",      note: "Palinpinon geothermal complex (Negros Oriental)" },
  { name: "Panay",   load: "~360 MW", gen: "Coal, Wind, Diesel, Hydro",             note: "Concepcion coal plant; Nabas wind; Iloilo City load centre" },
  { name: "Samar",   load: "~90 MW",  gen: "Diesel, Run-of-river hydro",            note: "Radial feed from Leyte via Babatngon–Sta. Rita" },
  { name: "Bohol",   load: "~100 MW", gen: "Diesel, Run-of-river hydro",            note: "Fed via Maasin–Ubay submarine cable from Leyte" },
  { name: "Guimaras", load: "~35 MW", gen: "Wind",                                  note: "Connected via 69 kV submarine cable from Bantap (Panay)" },
  { name: "Biliran", load: "—",       gen: "—",                                     note: "Modelled as part of Leyte cluster" },
];

const SUBMARINE_DATA = [
  { route: "Daanbantayan (Cebu) → Tabango (Leyte)", kv: 230, km: 46.5, circuits: 2 },
  { route: "Magdugo (Cebu) → Calatrava (Negros)",   kv: 230, km: 32.2, circuits: 1 },
  { route: "Amlan (Negros) → Samboan (Cebu)",        kv: 138, km: 14.2, circuits: 2 },
  { route: "Maasin (Leyte) → Ubay (Bohol)",          kv: 138, km: 33.0, circuits: 1 },
  { route: "Bantap (Panay) → Buenavista (Guimaras)", kv:  69, km:  8.4, circuits: 1 },
];

function Section({ title, children }) {
  return (
    <section className="mt-5 first:mt-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Prose({ children }) {
  return (
    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
      {children}
    </p>
  );
}

export default function AboutModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Visayas Transmission Grid
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              About this visualization
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5">

          <Section title="Overview">
            <Prose>
              The Visayas is the central island group of the Philippine archipelago, comprising
              eight major islands: Cebu, Leyte, Samar, Negros, Panay, Bohol, Biliran, and
              Guimaras. Together they form one of three separate synchronous areas in the
              Philippine power system — alongside Luzon and Mindanao — operated by the National
              Grid Corporation of the Philippines (NGCP).
            </Prose>
            <Prose>
              The grid spans 52 substations and 57 transmission lines at three AC voltage levels
              (230 kV, 138 kV, 69 kV), connecting all major islands through a combination of
              overhead lines and five submarine cable circuits crossing inter-island straits.
            </Prose>
          </Section>

          <Section title="Leyte–Luzon HVDC Link">
            <Prose>
              The most distinctive feature of the Visayas grid is the Leyte–Luzon High Voltage
              Direct Current (HVDC) interconnection. Commissioned in 1998 and rated at 440 MW,
              this ±350 kV link connects the Ormoc substation on Leyte to the Naga substation in
              Laguna, Luzon — a total route of approximately 440 km. It is the only power bridge
              between the Visayas and the Luzon grid.
            </Prose>
            <Prose>
              The link allows geothermal surplus from Leyte to serve Luzon demand, and enables
              emergency power sharing between the two islands. In the current model snapshot the
              Visayas is a net exporter, with about 35 MW flowing north to Luzon.
            </Prose>
          </Section>

          <Section title="Generation mix">
            <Prose>
              The Visayas is heavily geothermal. The Tongonan and Kananga fields in Leyte and
              the Palinpinon complex (I and II) in Negros Oriental together represent some of the
              largest geothermal capacity in Southeast Asia. Coal plants in Cebu (Daan Lungsod,
              KSPC, Therma Visayas, Toledo) and Panay (Concepcion, Iloilo PEDC) cover base-load
              demand. Renewable capacity is growing through wind (Guimaras, Nabas in Panay),
              solar (distributed across all islands), biomass (Negros sugar-mill co-generation),
              and run-of-river hydro (Samar, Panay). Total installed capacity is approximately
              3,100 MW against a system peak of roughly 1,800 MW (NGCP TDP 2024).
            </Prose>
          </Section>

          <Section title="Island snapshot">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">Island</th>
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">Peak load</th>
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">Primary generation</th>
                    <th className="py-1.5 font-semibold text-slate-600 dark:text-slate-300">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ISLAND_DATA.map((r) => (
                    <tr key={r.name}>
                      <td className="py-1.5 pr-3 font-medium text-slate-800 dark:text-slate-200">{r.name}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-400">{r.load}</td>
                      <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-400">{r.gen}</td>
                      <td className="py-1.5 text-slate-500 dark:text-slate-500">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Submarine cables">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">Route</th>
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">kV</th>
                    <th className="py-1.5 pr-3 font-semibold text-slate-600 dark:text-slate-300">km</th>
                    <th className="py-1.5 font-semibold text-slate-600 dark:text-slate-300">Circuits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {SUBMARINE_DATA.map((r) => (
                    <tr key={r.route}>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{r.route}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-400">{r.kv}</td>
                      <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-400">{r.km}</td>
                      <td className="py-1.5 tabular-nums text-slate-600 dark:text-slate-400">{r.circuits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              All submarine circuits use XLPE-insulated Cu 630 mm² cable (IEC 60840, 220 kV class).
              Electrical parameters: r = 0.0754 Ω/km, x = 0.121 Ω/km, c = 200 nF/km, I
              <sub>max</sub> = 0.645 kA.
            </p>
          </Section>

          <Section title="Modeling approach">
            <Prose>
              Load flow is computed using <strong>pandapower</strong> (AC Newton-Raphson,
              initialized from a DC solution). Transformer models are automatically inserted
              at all 17 cross-voltage substation connections so every transmission line runs at
              a consistent per-unit voltage base. Large generators (≥ 100 MW dispatched) are
              modelled as PV buses holding 1.02 pu with reactive capability of ±60/40% of
              dispatch. The Ormoc ext_grid (slack) absorbs or injects whatever real power is
              needed to balance the network — this is physically the HVDC link to Luzon.
            </Prose>
            <Prose>
              Load estimates are derived from NGCP feeder counts and regional demand totals.
              Generator dispatch factors follow NGCP TDP 2024 planning assumptions. Bus
              coordinates are approximate, derived from GPS data in the public TDP annex.
            </Prose>
          </Section>

          <Section title="Known limitations">
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {[
                "Shunt reactors at long submarine cable terminations are not modelled — causing voltage rise (Ferranti effect) at Daanbantayan, Tabango, and Compostela in the AC solution.",
                "SVC, STATCOM, and other reactive compensation devices are absent.",
                "A single average-demand snapshot is shown; no peak/off-peak or seasonal scenarios.",
                "Transformer MVA ratings and impedances use typical values (NGCP TDP Annex B); actual ratings per substation differ.",
                "No N-1 contingency analysis — the visualization shows the intact-network operating point only.",
                "Load distribution is uniform per feeder (12 MW/feeder); Cebu City is not disproportionately weighted vs rural feeders.",
              ].map((item) => (
                <li key={item} className="flex gap-2 leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Data sources">
            <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
              {[
                { label: "Network topology & bus data", source: "NGCP Transmission Development Plan 2024 (public release)" },
                { label: "Generator capacity & dispatch", source: "NGCP TDP 2024 Chapter 4; DOE Philippine Development Plan 2023–2050" },
                { label: "Submarine cable parameters", source: "IEC 60840:2020 (XLPE 630 mm² Cu, 127/220 kV class)" },
                { label: "Overhead line parameters", source: "NGCP TDP line data; IEEE Std 738 typical ACSR values" },
                { label: "HVDC link capacity", source: "NGCP TDP 2024 Chapter 5, Table 5-1 (440 MW rated)" },
                { label: "Load flow engine", source: "pandapower 2.x — open-source power system analysis (Python)" },
              ].map(({ label, source }) => (
                <li key={label} className="flex gap-2 leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-600" />
                  <span>
                    <strong className="font-medium text-slate-800 dark:text-slate-200">{label}:</strong>{" "}
                    {source}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 dark:border-slate-700">
          <span className="text-[11px] text-slate-400 dark:text-slate-600">
            Visualization model — not for operational use
          </span>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
