"""
Modeling constants and network metadata for the Visayas transmission model.

Sources cited inline. Key references:
  - NGCP Transmission Development Plan 2024–2033 (TDP 2024)
  - Philippine Department of Energy Power Development Plan 2023–2050 (DOE PDP 2023)
  - IEC 60840:2020 — HV submarine cables
  - IEC 60287-1:2023 — Cable current ratings
"""

from __future__ import annotations

# ─── Regional / topology ──────────────────────────────────────────────────────

# NGCP region prefix scheme: 04=Eastern Visayas (Leyte/Samar), 05=Cebu,
# 06=Negros, 07=Bohol, 08=Panay/Guimaras.
VISAYAS_PREFIXES = {"04", "05", "06", "07", "08"}

# Ormoc substation is the AC termination of the Leyte–Luzon HVDC link
# (±350 kV DC, 440 MW rated). Used as the slack bus so DC load flow treats
# HVDC import as the system's balancing reserve.
# Source: NGCP TDP 2024 Chapter 5, Table 5-1.
SLACK_BUS = "Ormoc"
HVDC_CAPACITY_MW = 440  # rated MW of the Leyte–Luzon HVDC link

# Merge duplicate NGCP nodes into one canonical bus (same physical facility).
MERGE_CODES: dict[str, str] = {"04STARITATAP": "04STARITA"}

# Drop these codes (distribution/internal nodes with no useful grid position).
DROP_CODES: set[str] = set()

# ─── Submarine cable electrical parameters ───────────────────────────────────

# 630 mm² Cu XLPE single-core submarine cable, 76/130 kV or 127/220 kV class.
# Used to replace NGCP total-impedance estimates divided by haversine distance,
# which are unreliable for submarine spans (cable routing ≠ great-circle path).
# Sources:
#   r_ohm_per_km  — IEC 60228 Class 2, Cu 630 mm², DC resistance at 90°C
#   x_ohm_per_km  — IEC 60287, typical laid flat formation
#   c_nf_per_km   — IEC 60840, XLPE 220 kV class (EPR/XLPE insulation)
#   max_i_ka      — IEC 60287 ampacity in seawater at 25°C, flat formation
SUBMARINE_XLPE: dict[str, float] = {
    "r_ohm_per_km": 0.0754,
    "x_ohm_per_km": 0.121,
    "c_nf_per_km":  200.0,
    "max_i_ka":     0.645,
}

# Typical overhead transmission line parameters by nominal voltage (reference
# only — not applied automatically; NGCP-sourced values are used where available).
# Sources: IEEE Std 738-2012, NGCP TDP 2024 Annex B.
OVERHEAD_DEFAULTS: dict[int, dict[str, float]] = {
    230: {"r_ohm_per_km": 0.060, "x_ohm_per_km": 0.400, "c_nf_per_km": 9.0},
    138: {"r_ohm_per_km": 0.100, "x_ohm_per_km": 0.420, "c_nf_per_km": 10.0},
    69:  {"r_ohm_per_km": 0.200, "x_ohm_per_km": 0.450, "c_nf_per_km": 8.7},
}

# Per-line impedance overrides: applied when inherited total-impedance ÷
# haversine distance produces physically implausible values (e.g. after a
# coordinate correction changes the apparent length significantly).
# Maps frozenset({bus0_code, bus1_code}) → parameter dict matching OVERHEAD_DEFAULTS.
LINE_IMPEDANCE_OVERRIDES: dict[frozenset, dict] = {
    # ~5 km spur to CEDC Toledo City coal plant. Coord fix (2026-05-24) revealed
    # inherited r_total was calibrated to wrong ~94.5 km; use 138 kV ACSR standard.
    frozenset({"05MAGDUGO", "05DAANLUNSOD"}): OVERHEAD_DEFAULTS[138],
}

# ─── Load modeling ────────────────────────────────────────────────────────────

# MW assigned to each distribution feeder attachment in data/temp/loads.csv.
# Calibrated so that ~140 Visayas feeders × 12 MW ≈ 1,680 MW base demand,
# approaching the ~2,100 MW Visayas 2024 peak (including interruptible load).
# Source: NGCP TDP 2024 Table 3-2 (Visayas regional demand).
LOAD_MW_PER_FEEDER = 12.0

# Q/P ratio derived from a typical Philippine distribution power factor of 0.96
# lagging: tan(arccos(0.96)) ≈ 0.292, rounded conservatively to 0.30.
# Source: Philippine Grid Code (PGC) Section 4.4.
LOAD_PF_QP_RATIO = 0.30

# ─── Generation dispatch ──────────────────────────────────────────────────────

# Capacity factors applied to nameplate p_nom to estimate typical output for
# the peak-demand snapshot. Based on 2022–2024 DOE capacity factor statistics
# and NGCP TDP 2024 typical dispatch assumptions.
# Source: DOE PDP 2023 Table A-2 (technology-specific capacity factors,
# Visayas/nationwide averages).
DISPATCH_FACTOR: dict[str, float] = {
    "Coal":       0.80,  # Near-baseload; Daan Lungsod, KSPC, Therma Visayas
    "Geothermal": 0.85,  # Baseload; Tongonan, Palinpinon 1/2, Kananga units
    "Biomass":    0.70,  # Firm renewable, scheduled dispatch
    "Hydro":      0.50,  # Storage hydro; derated for dry-season availability
    "ROR":        0.40,  # Run-of-river; intermittent, conservatively derated
    "Solar":      0.25,  # Peak-hour average including night hours (DOE 2023)
    "Wind":       0.30,  # DOE 2023 wind CF average for Visayas projects
    "Diesel":     0.30,  # Peaking/backup; not fully committed at peak
}

# ─── Submarine cable identification ──────────────────────────────────────────

# Bus-pairs known to be submarine cables (frozensets for order-independence).
# Anything else is assumed overhead — avoids false positives on the Leyte–Samar
# San Juanico Bridge crossing (which is overhead, not submarine).
# Source: NGCP TDP 2024 Annex C (submarine cable inventory).
SUBMARINE_PAIRS: set[frozenset[str]] = {
    frozenset({"05MAGDUGO", "06CALATRAVA"}),  # Cebu–Negros 230 kV (Magdugo–Calatrava)
    frozenset({"05SAMBOAN", "06AMLAN"}),       # Cebu–Negros 138 kV (Samboan–Amlan)
    frozenset({"05DAANBNTAY", "04TABANGO"}),   # Cebu–Leyte 230 kV (Daanbantayan–Tabango)
    frozenset({"05DUMANJUG", "07CORELLA"}),    # Cebu–Bohol (Dumanjug–Corella)
    frozenset({"04MAASIN", "07UBAY"}),         # Leyte–Bohol (Maasin–Ubay)
    frozenset({"06GAHIT", "08BAROTAC"}),       # Negros–Panay (E.B. Magalona–Barotac Viejo, Guimaras Strait)
    frozenset({"08BANTAP", "08BVISTA"}),       # Panay–Guimaras (Bantap–Buenavista)
}

# ─── Bus classification ───────────────────────────────────────────────────────

# NGCP v1_code → (readable_name, island, bus_type).
# bus_type: substation | generator | bess | hvdc
CODE_INFO: dict[str, tuple[str, str, str]] = {
    "04ORMOC":      ("Ormoc",                 "Leyte",    "hvdc"),
    "04BABATNGN":   ("Babatngon",             "Leyte",    "substation"),
    "04MAASIN":     ("Maasin",                "Leyte",    "substation"),
    "04TABANGO":    ("Tabango",               "Leyte",    "substation"),
    "04ISABEL":     ("Isabel",                "Leyte",    "substation"),
    "04KANANGA":    ("Kananga",               "Leyte",    "substation"),
    "04TONGONA":    ("Tongonan",              "Leyte",    "generator"),
    "04CALBAYOG":   ("Calbayog",              "Samar",    "substation"),
    "04PARANAS":    ("Paranas (Wright)",      "Samar",    "substation"),
    "04STARITA":    ("Sta. Rita",             "Samar",    "substation"),
    "05CEBU":       ("Cebu",                  "Cebu",     "substation"),
    "05MANDAUE":    ("Mandaue",               "Cebu",     "substation"),
    "05LAPULAPU":   ("Lapu-Lapu (Pusok)",     "Cebu",     "substation"),
    "05MAGDUGO":    ("Magdugo",               "Cebu",     "substation"),
    "05DAANBNTAY":  ("Daanbantayan",          "Cebu",     "substation"),
    "05DAANLUNSOD": ("Daan Lungsod",          "Cebu",     "substation"),
    "05COMPSTLA":   ("Compostela",            "Cebu",     "substation"),
    "05COLON":      ("Colon",                 "Cebu",     "substation"),
    "05TOLEDO":     ("Toledo",                "Cebu",     "substation"),
    "05TOLBESS":    ("Toledo BESS",           "Cebu",     "bess"),
    "05CALUNG":     ("Calong-calong",         "Cebu",     "substation"),
    "05NAGA":       ("Naga (Visayas)",        "Cebu",     "substation"),
    "05QUIOT":      ("Quiot",                 "Cebu",     "substation"),
    "05SAMBOAN":    ("Samboan",               "Cebu",     "substation"),
    "05DUMANJUG":   ("Dumanjug",              "Cebu",     "substation"),
    "05KSPC":       ("KSPC",                  "Cebu",     "generator"),
    "05THERMA":     ("Therma Visayas",        "Cebu",     "generator"),
    "06BACOLOD":    ("Bacolod",               "Negros",   "substation"),
    "06CADIZ":      ("Cadiz",                 "Negros",   "substation"),
    "06AMLAN":      ("Amlan",                 "Negros",   "substation"),
    "06MABINAY":    ("Mabinay",               "Negros",   "substation"),
    "06KABANKALAN": ("Kabankalan",            "Negros",   "substation"),
    "06KBANBESS":   ("Kabankalan BESS",       "Negros",   "bess"),
    "06SNCARLOS":   ("San Carlos",            "Negros",   "substation"),
    "06CALATRAVA":  ("Calatrava",             "Negros",   "substation"),
    "06HELIOS":     ("Helios Solar",          "Negros",   "generator"),
    "06GAHIT":      ("E.B. Magalona",         "Negros",   "substation"),
    "06PGPP1":      ("Palinpinon 1",          "Negros",   "generator"),
    "06PGPP2":      ("Palinpinon 2",          "Negros",   "generator"),
    "07CORELLA":    ("Corella",               "Bohol",    "substation"),
    "07UBAY":       ("Ubay",                  "Bohol",    "substation"),
    "07TAPAL":      ("Tapal",                 "Bohol",    "substation"),
    "08BAROTAC":    ("Barotac Viejo",         "Panay",    "substation"),
    "08PANITAN":    ("Panitan",               "Panay",    "substation"),
    "08DINGLE":     ("Dingle",                "Panay",    "substation"),
    "08STBARBRA":   ("Sta. Barbara",          "Panay",    "substation"),
    "08SNJOSE":     ("San Jose",              "Panay",    "substation"),
    "08ILOILO1":    ("Iloilo (PEDC)",         "Panay",    "substation"),
    "08CONCEPCION": ("Concepcion",            "Panay",    "substation"),
    "08NABAS":      ("Nabas",                 "Panay",    "substation"),
    "08BANTAP":     ("Bantap",                "Panay",    "substation"),
    "08BVISTA":     ("Buenavista (Guimaras)", "Guimaras", "substation"),
}
