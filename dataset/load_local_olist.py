import os
from pathlib import Path
from tqdm import tqdm
import argparse

import pandas as pd
from sqlalchemy import create_engine, text

# ====== KONFIGURASI DASAR ======
# Daftar file standar Olist (jika ada file lain *.csv di folder akan ikut dimuat juga)
CSV_FILES = [
    "olist_customers_dataset.csv",
    "olist_geolocation_dataset.csv",
    "olist_orders_dataset.csv",
    "olist_order_items_dataset.csv",
    "olist_order_payments_dataset.csv",
    "olist_order_reviews_dataset.csv",
    "olist_products_dataset.csv",
    "olist_sellers_dataset.csv",
    "product_category_name_translation.csv",
]

# Kolom tanggal yang diparse otomatis
DATE_COLS = {
    "olist_orders_dataset.csv": [
        "order_purchase_timestamp",
        "order_approved_at",
        "order_delivered_carrier_date",
        "order_delivered_customer_date",
        "order_estimated_delivery_date",
    ],
    "olist_order_reviews_dataset.csv": [
        "review_creation_date",
        "review_answer_timestamp",
    ],
}

# ====== KONEKSI DB ======
def get_engine_from_env():
    # EDIT sesuai kebutuhan Anda
    host = "localhost"
    port = "5432"
    db   = "olist_ecom_raw"
    user = "postgres"
    pwd  = "inisandiku"
    url  = f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{db}"
    return create_engine(url, pool_pre_ping=True)

def ensure_schema(engine, schema: str):
    with engine.begin() as conn:
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema};"))

# ====== UTIL ======
def clean_cols(cols: pd.Index) -> pd.Index:
    return (
        cols.str.strip()
            .str.replace(" ", "_", regex=False)
            .str.replace("-", "_", regex=False)
            .str.replace(".", "_", regex=False)
            .str.lower()
    )

def to_table_name(csv_path: Path) -> str:
    # contoh: olist_orders_dataset.csv -> olist_orders_dataset
    return csv_path.stem.lower()

def resolve_csv_paths(data_dir: Path):
    """Prioritaskan nama file standar; file *.csv lain ikut dimuat juga."""
    found = []
    for name in CSV_FILES:
        p = data_dir / name
        if p.exists():
            found.append(p)
    for p in sorted(data_dir.glob("*.csv")):
        if p not in found:
            found.append(p)
    return found

def preview_csvs(paths, n=5, encoding="utf-8"):
    print("\n===== PREVIEW RAW DATA (head) =====")
    for p in paths:
        try:
            parse_dates = DATE_COLS.get(p.name, [])
            df = pd.read_csv(
                p, nrows=n, parse_dates=parse_dates,
                keep_default_na=False, low_memory=False, encoding=encoding
            )
            print(f"\n--- {p.name} ---")
            print(f"Shape (preview {n} baris): {df.shape}")
            print(df.head(n))
        except Exception as e:
            print(f"Gagal preview {p.name}: {e}")

def load_csv_to_postgres(engine, csv_path: Path, schema: str,
                         chunksize: int = 100_000, encoding: str = "utf-8"):
    table = to_table_name(csv_path)
    parse_dates = DATE_COLS.get(csv_path.name, [])

    print(f"\nMemuat {csv_path.name} -> {schema}.{table} (chunksize={chunksize}) ...")
    total_rows = 0
    first_chunk = True

    try:
        for chunk in pd.read_csv(
            csv_path,
            chunksize=chunksize,
            parse_dates=parse_dates,
            keep_default_na=False,   # string kosong tetap "", bukan NaN
            encoding=encoding,
            low_memory=False,
        ):
            # rapikan nama kolom
            chunk.columns = clean_cols(chunk.columns)

            # tulis ke Postgres; CHUNK PERTAMA = replace (auto create table), berikutnya append
            chunk.to_sql(
                name=table,
                schema=schema,
                con=engine,
                if_exists="replace" if first_chunk else "append",
                index=False,
                method="multi",
            )
            total_rows += len(chunk)
            first_chunk = False

        print(f"Selesai: {schema}.{table} total rows: {total_rows:,}")
    except Exception as e:
        print(f"ERROR saat memuat {csv_path.name}: {e}")

# ====== MAIN ======
def main():
    parser = argparse.ArgumentParser(description="Load Olist CSV (lokal) ke PostgreSQL (auto create table)")
    parser.add_argument("--data-dir", required=True, help="Folder yang berisi semua CSV Olist")
    parser.add_argument("--schema", default="olist_raw", help="Schema PostgreSQL (default: olist_raw)")
    parser.add_argument("--chunksize", type=int, default=100_000, help="Jumlah baris per chunk saat load")
    parser.add_argument("--encoding", default="utf-8", help="Encoding CSV (ubah ke latin1 jika error)")
    args = parser.parse_args()

    data_dir = Path(args.data_dir).expanduser().resolve()
    if not data_dir.exists():
        raise FileNotFoundError(f"Folder tidak ditemukan: {data_dir}")

    # Temukan CSV
    csv_paths = resolve_csv_paths(data_dir)
    if not csv_paths:
        print(f"Tidak ada file .csv di {data_dir}")
        return

    # Preview raw
    preview_csvs(csv_paths, n=5, encoding=args.encoding)

    # Koneksi & schema
    engine = get_engine_from_env()
    ensure_schema(engine, args.schema)

    # Load per file
    for p in tqdm(csv_paths, desc="Loading CSV to Postgres"):
        load_csv_to_postgres(
            engine,
            csv_path=p,
            schema=args.schema,
            chunksize=args.chunksize,
            encoding=args.encoding,
        )

    print("\nSelesai. Cek tabel pada schema:", args.schema)

if __name__ == "__main__":
    main()
