#!/usr/bin/env python3
"""
Parquet -> JSON Exporter

Convierte los parquet generados por data_processor.py
a JSON optimizado para frontend.

Uso:
    py export_json.py
"""

from pathlib import Path
import pandas as pd
import json

# =============================================================================
# CONFIG
# =============================================================================

ROOT_DIR = Path(__file__).parent

PARQUET_DIR = ROOT_DIR / "data" / "parquet"
OUTPUT_DIR = ROOT_DIR / "data"

# =============================================================================
# HELPERS
# =============================================================================

def load_parquet(filename: str) -> pd.DataFrame:
    """
    Carga parquet.
    """

    path = PARQUET_DIR / filename

    if not path.exists():
        raise FileNotFoundError(
            f"No existe: {path}"
        )

    print(f"📦 Leyendo {filename}")

    return pd.read_parquet(path)


def export_json(
    df: pd.DataFrame,
    filename: str
):
    """
    Exporta dataframe a JSON.
    """

    output_path = OUTPUT_DIR / filename

    print(f"💾 Exportando {filename}")

    df.to_json(
        output_path,
        orient="records",
        force_ascii=False
    )


# =============================================================================
# START
# =============================================================================

print("=" * 60)
print("PARQUET → JSON EXPORTER")
print("=" * 60)

# =============================================================================
# MATCHES
# =============================================================================

df_matches = load_parquet(
    "matches.parquet"
)

matches_export = df_matches[
    [
        "match_id",
        "match_date",
        "home_team_name",
        "away_team_name",
        "home_score",
        "away_score",
    ]
].rename(
    columns={
        "home_team_name": "home_team",
        "away_team_name": "away_team",
    }
)

export_json(
    matches_export,
    "matches.json"
)

print(
    f"✓ {len(matches_export)} partidos"
)

# =============================================================================
# POSSESSIONS
# =============================================================================

df_possessions = load_parquet(
    "possessions.parquet"
)

export_json(
    df_possessions,
    "possessions.json"
)

print(
    f"✓ {len(df_possessions)} posesiones"
)

# =============================================================================
# PASSES
# =============================================================================

df_passes = load_parquet(
    "passes.parquet"
)

export_json(
    df_passes,
    "passes.json"
)


print(
    f"✓ {len(df_passes)} pases"
)

# =============================================================================
# SHOTS
# =============================================================================

df_shots = load_parquet(
    "shots.parquet"
)

export_json(
    df_shots,
    "shots.json"
)

print(
    f"✓ {len(df_shots)} shots"
)

# =============================================================================
# FINAL
# =============================================================================

print("\n" + "=" * 60)
print("EXPORT COMPLETADO")
print("=" * 60)

print("\nJSON generados en:")
print(OUTPUT_DIR)

print("\nArchivos:")
print(" - matches.json")
print(" - possessions.json")
print(" - passes.json")
print(" - shots.json")