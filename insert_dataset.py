import pandas as pd
import psycopg2
import os

# --- Konfigurasi Database PostgreSQL ---
DB_HOST = "localhost"
DB_NAME = "olist_ecom"
DB_USER = "postgres"  # Ganti dengan username Anda
DB_PASS = "inisandiku"  # Ganti dengan password Anda

# --- Lokasi Folder Dataset ---
DATASET_FOLDER = "dataset"

# --- Urutan Pemuatan Data (PENTING!) ---
# Pemuatan harus dimulai dari tabel yang tidak memiliki foreign key
# atau tabel yang direferensikan oleh tabel lain.
# Misalnya, tabel 'products' harus dimuat sebelum 'order_items'.
LOADING_ORDER = [
    "olist_products_dataset.csv",
    "product_category_name_translation.csv",
    "olist_customers_dataset.csv",
    "olist_sellers_dataset.csv",
    "olist_geolocation_dataset.csv",
    "olist_orders_dataset.csv",
    "olist_order_items_dataset.csv",
    "olist_order_payments_dataset.csv",
    "olist_order_reviews_dataset.csv",
]

# --- Mapping Nama File CSV ke Nama Tabel Database ---
FILE_TABLE_MAP = {
    "olist_customers_dataset.csv": "customers",
    "olist_geolocation_dataset.csv": "geolocation",
    "olist_orders_dataset.csv": "orders",
    "olist_order_items_dataset.csv": "order_items",
    "olist_order_payments_dataset.csv": "order_payments",
    "olist_order_reviews_dataset.csv": "order_reviews",
    "olist_products_dataset.csv": "products",
    "olist_sellers_dataset.csv": "sellers",
    "product_category_name_translation.csv": "product_category_name_translation"
}

def load_data_to_postgres():
    """
    Memuat data dari file CSV ke database PostgreSQL dengan penanganan urutan dan duplikat.
    """
    try:
        conn = psycopg2.connect(host=DB_HOST, database=DB_NAME, user=DB_USER, password=DB_PASS)
        cur = conn.cursor()
        print("Berhasil terhubung ke database PostgreSQL.")

        for file_name in LOADING_ORDER:
            table_name = FILE_TABLE_MAP.get(file_name)
            if not table_name:
                print(f"File {file_name} tidak memiliki mapping tabel. Melewati...")
                continue
            
            csv_path = os.path.join(DATASET_FOLDER, file_name)

            if not os.path.exists(csv_path):
                print(f"File {csv_path} tidak ditemukan. Melewati...")
                continue
            
            try:
                print(f"Memuat data dari '{file_name}' ke tabel '{table_name}'...")
                
                # --- Penanganan Duplikat (Khusus untuk order_reviews) ---
                if table_name == "order_reviews":
                    df = pd.read_csv(csv_path)
                    original_rows = len(df)
                    df.drop_duplicates(subset=["review_id"], keep="first", inplace=True)
                    cleaned_rows = len(df)
                    print(f"  - Menghapus {original_rows - cleaned_rows} duplikat dari data ulasan.")

                    # Memasukkan DataFrame yang sudah bersih ke database
                    from io import StringIO
                    buffer = StringIO()
                    df.to_csv(buffer, index=False, header=True)
                    buffer.seek(0)
                    cur.copy_expert(f"COPY {table_name} FROM STDIN WITH CSV HEADER", buffer)

                else:
                    # Menggunakan COPY FROM STDIN untuk file lain
                    with open(csv_path, 'r', encoding='utf-8') as f:
                        cur.copy_expert(f"COPY {table_name} FROM STDIN WITH CSV HEADER", f)
                
                conn.commit()
                print(f"Selesai memuat data ke tabel '{table_name}'.")

            except Exception as e:
                print(f"Error saat memuat data dari {file_name}: {e}")
                conn.rollback() 

    except psycopg2.Error as e:
        print(f"Gagal terhubung ke database: {e}")

    finally:
        if 'conn' in locals() and conn:
            cur.close()
            conn.close()
            print("Koneksi database ditutup.")

if __name__ == "__main__":
    load_data_to_postgres()