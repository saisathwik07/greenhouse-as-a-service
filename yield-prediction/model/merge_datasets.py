"""
Merge agricultural CSVs for yield prediction.

Dataset placement (put these files in the project `data/` folder):
  - data/yield.csv       — crop yield (FAO-style; expects a `Value` column for yield amount)
  - data/rainfall.csv    — rainfall by area and year
  - data/temp.csv        — temperature by country/area and year
  - data/pesticides.csv  — pesticide use (expects a `Value` column)

The script reads from `../data/` relative to this file. Output: `data/final_dataset.csv`.

Note: If a file uses different column names than `Value` (e.g. `avg_temp` or
`average_rain_fall_mm_per_year`), the script maps them to the names below so merges still work.
"""

from pathlib import Path

import pandas as pd

# Project paths: model/merge_datasets.py -> project root is parent of model/
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_PATH = DATA_DIR / "final_dataset.csv"


def _strip_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = df.columns.str.strip()
    return df


def load_yield(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = _strip_columns(df)
    if "Value" not in df.columns:
        raise ValueError("yield.csv: expected a column named 'Value'")
    df = df.rename(columns={"Value": "yield"})
    df["yield"] = pd.to_numeric(df["yield"], errors="coerce")
    return df


def load_rainfall(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = _strip_columns(df)
    if "Value" in df.columns:
        df = df.rename(columns={"Value": "rainfall"})
    elif "average_rain_fall_mm_per_year" in df.columns:
        df = df.rename(columns={"average_rain_fall_mm_per_year": "rainfall"})
    else:
        raise ValueError(
            "rainfall.csv: need 'Value' or 'average_rain_fall_mm_per_year'"
        )
    df["rainfall"] = pd.to_numeric(df["rainfall"], errors="coerce")
    return df


def load_temp(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = _strip_columns(df)
    # Common layouts: FAO-style (Year, Area, Value) or weather extract (year, country, avg_temp)
    colmap = {}
    if "Year" in df.columns:
        pass
    elif "year" in df.columns:
        colmap["year"] = "Year"
    else:
        raise ValueError("temp.csv: expected 'Year' or 'year'")

    if "Area" in df.columns:
        pass
    elif "country" in df.columns:
        colmap["country"] = "Area"
    else:
        raise ValueError("temp.csv: expected 'Area' or 'country'")

    if colmap:
        df = df.rename(columns=colmap)

    if "Value" in df.columns:
        df = df.rename(columns={"Value": "temperature"})
    elif "avg_temp" in df.columns:
        df = df.rename(columns={"avg_temp": "temperature"})
    else:
        raise ValueError("temp.csv: need 'Value' or 'avg_temp' for temperature")
    df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
    return df


def load_pesticides(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df = _strip_columns(df)
    if "Value" not in df.columns:
        raise ValueError("pesticides.csv: expected a column named 'Value'")
    df = df.rename(columns={"Value": "pesticide"})
    df["pesticide"] = pd.to_numeric(df["pesticide"], errors="coerce")
    return df


def normalize_keys(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure Year is numeric and Area is a clean string for merging."""
    out = df.copy()
    out["Year"] = pd.to_numeric(out["Year"], errors="coerce").astype("Int64")
    out["Area"] = out["Area"].astype(str).str.strip()
    return out


def main() -> None:
    print("Step 1: Loading CSV files from", DATA_DIR)
    path_yield = DATA_DIR / "yield.csv"
    path_rain = DATA_DIR / "rainfall.csv"
    path_temp = DATA_DIR / "temp.csv"
    path_pest = DATA_DIR / "pesticides.csv"

    for p in (path_yield, path_rain, path_temp, path_pest):
        if not p.exists():
            raise FileNotFoundError(f"Missing dataset: {p}")

    df_yield = load_yield(path_yield)
    print(f"  Loaded yield: {len(df_yield)} rows, columns include {list(df_yield.columns)[:6]}...")

    df_rain = load_rainfall(path_rain)
    print(f"  Loaded rainfall: {len(df_rain)} rows")

    df_temp = load_temp(path_temp)
    print(f"  Loaded temp: {len(df_temp)} rows")

    df_pest = load_pesticides(path_pest)
    print(f"  Loaded pesticides: {len(df_pest)} rows")

    print("Step 2: Renaming measure columns (Value / equivalents -> yield, rainfall, temperature, pesticide)")
    print("  Done inside load_* helpers.")

    print("Step 3: Normalizing Year and Area for merging")
    df_yield = normalize_keys(df_yield)
    df_rain = normalize_keys(df_rain)
    df_temp = normalize_keys(df_temp)
    df_pest = normalize_keys(df_pest)

    # Keep one rainfall row per Year-Area (if duplicates exist, average)
    rain_keys = df_rain.groupby(["Year", "Area"], as_index=False)["rainfall"].mean()
    temp_keys = df_temp.groupby(["Year", "Area"], as_index=False)["temperature"].mean()
    pest_keys = df_pest.groupby(["Year", "Area"], as_index=False)["pesticide"].mean()

    print("Step 4: Merging on Year and Area (inner join)")
    merged = df_yield.merge(rain_keys, on=["Year", "Area"], how="inner")
    print(f"  After merge with rainfall: {len(merged)} rows")
    merged = merged.merge(temp_keys, on=["Year", "Area"], how="inner")
    print(f"  After merge with temp: {len(merged)} rows")
    merged = merged.merge(pest_keys, on=["Year", "Area"], how="inner")
    print(f"  After merge with pesticides: {len(merged)} rows")

    print("Step 5: Removing rows with missing values")
    before = len(merged)
    merged = merged.dropna()
    print(f"  Dropped {before - len(merged)} rows; {len(merged)} rows remain")

    print("Step 6: Saving", OUTPUT_PATH)
    merged.to_csv(OUTPUT_PATH, index=False)
    print("Done. Final shape:", merged.shape)


if __name__ == "__main__":
    main()
