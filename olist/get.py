from datetime import datetime, timedelta, timezone
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
# import os  # disarankan: simpan key di ENV

# ====== Kredensial (jangan commit key ke repo publik) ======
account_name = 'vierifirdaus'
account_key = ''  # contoh: os.environ["AZURE_STORAGE_KEY"]
container_name = 'public'

# ====== Koneksi ke Blob Storage ======
connect_str = (
    f'DefaultEndpointsProtocol=https;'
    f'AccountName={account_name};'
    f'AccountKey={account_key};'
    f'EndpointSuffix=core.windows.net'
)
blob_service_client = BlobServiceClient.from_connection_string(connect_str)
container_client = blob_service_client.get_container_client(container_name)

# ====== Ambil daftar semua blob ======
blobs = list(container_client.list_blobs())

if not blobs:
    print("Container kosong.")
else:
    # Tampilkan daftar file (isi list dari file/daftar blob)
    print("Daftar semua file (blob) di container:")
    for i, b in enumerate(blobs, 1):
        size = getattr(b, "size", None)
        lm = getattr(b, "last_modified", None)
        print(f"{i:2d}. {b.name}  | size={size}  | last_modified={lm}")

    # Filter hanya file CSV
    csv_blobs = [b.name for b in blobs if b.name.lower().endswith(".csv")]

    if not csv_blobs:
        print("\nTidak ada file .csv ditemukan.")
    else:
        # Waktu kedaluwarsa SAS (UTC & timezone-aware)
        expiry_time = datetime.now(timezone.utc) + timedelta(hours=1)

        def build_sas_url(blob_name: str) -> str:
            sas = generate_blob_sas(
                account_name=account_name,
                container_name=container_name,
                blob_name=blob_name,
                account_key=account_key,
                permission=BlobSasPermissions(read=True),
                expiry=expiry_time,
            )
            return f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas}"

        # Tampilkan isi list file CSV (nama-nama filenya)
        print("\nList file CSV:")
        for i, name in enumerate(csv_blobs, 1):
            print(f"{i:2d}. {name}")
