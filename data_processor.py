#!/usr/bin/env python3
"""
StatsBomb Open Data Processor

- Descarga datos oficiales StatsBomb
- Usa cache local JSON
- Genera parquet optimizado
- Exporta datasets listos para visualización

Autor: Sergio
"""

from pathlib import Path
import json
import requests
import pandas as pd
from tqdm import tqdm

# =============================================================================
# CONFIG
# =============================================================================

COMPETITION_ID = 43
SEASON_ID = 106

BASE_URL = (
    "https://raw.githubusercontent.com/"
    "statsbomb/open-data/master/data"
)

TIMEOUT = 20

ROOT_DIR = Path(__file__).parent

CACHE_DIR = ROOT_DIR / "cache"
OUTPUT_DIR = ROOT_DIR / "data"

MATCHES_CACHE = CACHE_DIR / "matches"
EVENTS_CACHE = CACHE_DIR / "events"

PARQUET_DIR = OUTPUT_DIR / "parquet"

MATCHES_CACHE.mkdir(parents=True, exist_ok=True)
EVENTS_CACHE.mkdir(parents=True, exist_ok=True)
PARQUET_DIR.mkdir(parents=True, exist_ok=True)

# =============================================================================
# HELPERS
# =============================================================================


def fetch_json(url: str, cache_path: Path):
    """
    Descarga JSON usando cache local.
    """

    # usar cache
    if cache_path.exists():

        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # descargar
    response = requests.get(url, timeout=TIMEOUT)
    response.raise_for_status()

    data = response.json()

    # guardar cache
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(data, f)

    return data


def extract_coordinates(
    df: pd.DataFrame,
    source_col: str,
    prefix=""
):
    """
    Extrae coordenadas StatsBomb.
    """

    if source_col not in df.columns:

        coords = pd.DataFrame({
            f"{prefix}x": [None] * len(df),
            f"{prefix}y": [None] * len(df),
        })

    else:

        coords = pd.DataFrame({
            f"{prefix}x": df[source_col].str[0],
            f"{prefix}y": df[source_col].str[1],
        })

    return pd.concat([df, coords], axis=1)


def save_parquet(df: pd.DataFrame, path: Path):
    """
    Guarda parquet comprimido.
    """

    df.to_parquet(
        path,
        engine="pyarrow",
        compression="snappy",
        index=False
    )


# =============================================================================
# START
# =============================================================================

print("=" * 60)
print("STATSBOMB DATA PROCESSOR")
print("=" * 60)

# =============================================================================
# 1. MATCHES
# =============================================================================

print("\n[1/6] Descargando partidos...")

matches_url = (
    f"{BASE_URL}/matches/"
    f"{COMPETITION_ID}/{SEASON_ID}.json"
)

matches_cache = (
    MATCHES_CACHE /
    f"{COMPETITION_ID}_{SEASON_ID}.json"
)

matches = fetch_json(
    matches_url,
    matches_cache
)

df_matches = pd.json_normalize(matches)

# estructura real StatsBomb
df_matches["home_team_name"] = (
    df_matches["home_team.home_team_name"]
)

df_matches["away_team_name"] = (
    df_matches["away_team.away_team_name"]
)

print(f"✓ {len(df_matches)} partidos")

# parquet
matches_parquet = (
    PARQUET_DIR / "matches.parquet"
)

save_parquet(
    df_matches,
    matches_parquet
)

# =============================================================================
# 2. EVENTS
# =============================================================================

print("\n[2/6] Descargando eventos...")

all_events = []

for match_id in tqdm(
    df_matches["match_id"],
    desc="Partidos"
):

    events_url = (
        f"{BASE_URL}/events/{match_id}.json"
    )

    events_cache = (
        EVENTS_CACHE / f"{match_id}.json"
    )

    try:

        events = fetch_json(
            events_url,
            events_cache
        )

        df = pd.json_normalize(events)

        df["match_id"] = match_id

        all_events.append(df)

    except Exception as e:

        print(f"⚠ Match {match_id}: {e}")

if not all_events:
    raise RuntimeError(
        "No se descargaron eventos"
    )

df_events = pd.concat(
    all_events,
    ignore_index=True
)

print(f"✓ {len(df_events)} eventos")

# parquet raw
events_parquet = (
    PARQUET_DIR / "events_raw.parquet"
)

save_parquet(
    df_events,
    events_parquet
)

# =============================================================================
# 3. NORMALIZAR
# =============================================================================

print("\n[3/6] Normalizando datos...")

# coordenadas principales
df_events = extract_coordinates(
    df_events,
    "location"
)

# pases
df_events = extract_coordinates(
    df_events,
    "pass.end_location",
    prefix="pass_end_"
)

# shots
df_events = extract_coordinates(
    df_events,
    "shot.end_location",
    prefix="shot_end_"
)

# merge info partidos
df_events = df_events.merge(
    df_matches[
        [
            "match_id",
            "match_date",
            "home_team_name",
            "away_team_name",
            "home_score",
            "away_score",
        ]
    ],
    on="match_id",
    how="left"
)

# parquet normalized
normalized_parquet = (
    PARQUET_DIR / "events_normalized.parquet"
)

save_parquet(
    df_events,
    normalized_parquet
)

print("✓ Eventos normalizados")

# =============================================================================
# 4. PASSES
# =============================================================================

print("\n[4/6] Procesando pases...")

df_passes = df_events[
    df_events["type.name"] == "Pass"
].copy()

# StatsBomb:
# outcome NaN => successful
df_passes["successful"] = (
    df_passes["pass.outcome.name"]
    .isna()
    .astype(int)
)

passes_export = df_passes[
    [
        "match_id",
        "team.name",
        "player.name",
        "minute",
        "second",
        "x",
        "y",
        "pass_end_x",
        "pass_end_y",
        "successful",
        "pass.length",
        "pass.angle",
        "pass.height.name",
        "pass.type.name",
    ]
].rename(
    columns={
        "team.name": "team",
        "player.name": "player",
        "pass_end_x": "end_x",
        "pass_end_y": "end_y",
        "pass.height.name": "height",
        "pass.type.name": "pass_type",
    }
)

passes_parquet = (
    PARQUET_DIR / "passes.parquet"
)

save_parquet(
    passes_export,
    passes_parquet
)

print(f"✓ {len(df_passes)} pases")

# =============================================================================
# 5. SHOTS
# =============================================================================

print("\n[5/6] Procesando shots...")

df_shots = df_events[
    df_events["type.name"] == "Shot"
].copy()

df_shots["goal"] = (
    df_shots["shot.outcome.name"]
    == "Goal"
).astype(int)

shots_export = df_shots[
    [
        "match_id",
        "team.name",
        "player.name",
        "minute",
        "second",
        "x",
        "y",
        "shot_end_x",
        "shot_end_y",
        "goal",
        "shot.outcome.name",
        "shot.statsbomb_xg",
    ]
].rename(
    columns={
        "team.name": "team",
        "player.name": "player",
        "shot_end_x": "end_x",
        "shot_end_y": "end_y",
        "shot.outcome.name": "outcome",
        "shot.statsbomb_xg": "xg",
    }
)

shots_parquet = (
    PARQUET_DIR / "shots.parquet"
)

save_parquet(
    shots_export,
    shots_parquet
)

print(
    f"✓ {len(df_shots)} shots "
    f"({df_shots['goal'].sum()} goles)"
)

# =============================================================================
# 6. POSSESSIONS
# =============================================================================

print("\n[6/6] Construyendo posesiones...")

possessions = []

grouped = df_events.groupby(
    ["match_id", "possession"],
    sort=False
)

for (match_id, possession_id), group in tqdm(
    grouped,
    desc="Posesiones"
):

    group = group.sort_values("index")

    passes = group[
        group["type.name"] == "Pass"
    ].copy()

    if passes.empty:
        continue

    # successful
    passes["successful"] = (
        passes["pass.outcome.name"]
        .isna()
        .astype(int)
    )

    # team
    team = passes.iloc[0].get("team.name")

    # match info
    match_info = df_matches[
        df_matches["match_id"] == match_id
    ].iloc[0]

    # pases
    pass_records = passes[
        [
            "player.name",
            "x",
            "y",
            "pass_end_x",
            "pass_end_y",
            "minute",
            "second",
            "successful",
            "pass.height.name",
            "pass.type.name",
        ]
    ].rename(
        columns={
            "player.name": "player",
            "pass_end_x": "end_x",
            "pass_end_y": "end_y",
            "pass.height.name": "height",
            "pass.type.name": "pass_type",
        }
    )

    passes_list = pass_records.to_dict(
        orient="records"
    )

    # shots
    possession_shots = group[
        group["type.name"] == "Shot"
    ]

    ended_in_shot = (
        not possession_shots.empty
    )

    ended_in_goal = False

    shot_info = None

    if ended_in_shot:

        last_shot = (
            possession_shots.iloc[-1]
        )

        ended_in_goal = (
            last_shot.get(
                "shot.outcome.name"
            ) == "Goal"
        )

        shot_info = {
            "player": last_shot.get(
                "player.name"
            ),
            "x": last_shot.get("x"),
            "y": last_shot.get("y"),
            "end_x": last_shot.get(
                "shot_end_x"
            ),
            "end_y": last_shot.get(
                "shot_end_y"
            ),
            "outcome": last_shot.get(
                "shot.outcome.name"
            ),
            "goal": int(ended_in_goal),
            "xg": last_shot.get(
                "shot.statsbomb_xg"
            ),
        }

    possessions.append({
        "id": f"{match_id}_{possession_id}",
        "match_id": int(match_id),
        "match_date": match_info[
            "match_date"
        ],
        "home_team": match_info[
            "home_team_name"
        ],
        "away_team": match_info[
            "away_team_name"
        ],
        "team": team,
        "possession": int(
            possession_id
        ),
        "duration": group[
            "duration"
        ].sum(),
        "event_count": len(group),
        "pass_count": len(
            passes_list
        ),
        "successful_passes": int(
            sum(
                p["successful"]
                for p in passes_list
            )
        ),
        "ended_in_shot": (
            ended_in_shot
        ),
        "ended_in_goal": (
            ended_in_goal
        ),
        "shot": shot_info,
        "passes": passes_list,
    })

df_possessions = pd.DataFrame(
    possessions
)

possessions_parquet = (
    PARQUET_DIR /
    "possessions.parquet"
)

save_parquet(
    df_possessions,
    possessions_parquet
)

print(
    f"✓ {len(df_possessions)} posesiones"
)

# =============================================================================
# FINAL STATS
# =============================================================================

print("\n" + "=" * 60)
print("FINAL STATS")
print("=" * 60)

total_passes = len(df_passes)

successful_passes = int(
    df_passes["successful"].sum()
)

accuracy = (
    successful_passes
    / total_passes
    * 100
)

print(f"\nPartidos:      {len(df_matches)}")
print(f"Eventos:       {len(df_events)}")
print(f"Pases:         {len(df_passes)}")
print(f"Shots:         {len(df_shots)}")
print(f"Goles:         {df_shots['goal'].sum()}")
print(
    f"Posesiones:    "
    f"{len(df_possessions)}"
)
print(
    f"Precisión pase:"
    f" {accuracy:.2f}%"
)

print("\n✓ PROCESO COMPLETADO")

print("\nParquet generado en:")
print(PARQUET_DIR)