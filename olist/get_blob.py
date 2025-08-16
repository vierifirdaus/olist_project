# save as download_azure_file.py
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from azure.storage.fileshare import ShareFileClient
from azure.core.exceptions import HttpResponseError
import requests
import sys
import os

# ==== MASUKKAN NILAI ANDA DI SINI ====
FILE_URL_BASE = "https://vierifirdaus.file.core.windows.net/olistcustomersdataset/test.txt"
SAS_TOKEN     = "?sv=2025-05-05&spr=https%2Chttp&sip=0.0.0.0&si=olistcustomersdataset-2025-08-13-20%3A58%3A55.453&sr=f&sig=7JEwjtm7dLi0f%2FcYgqOHJz1UMwOIz0c%2BswK6y154rCA%3D"
# =====================================

def join_url_and_sas(base_url: str, sas: str) -> str:
    """Gabungkan base URL dan SAS token menjadi satu URL final."""
    # jika base_url sudah mengandung '?', anggap sudah full; pakai apa adanya
    if "?" in base_url:
        return base_url
    q = sas[1:] if sas.startswith("?") else sas
    parsed = urlparse(base_url)
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", q, ""))

def warn_if_bad_sip(full_sas_or_url: str):
    """Berikan peringatan jika ada sip=0.0.0.0 (pasti memblokir akses)."""
    query = urlparse(full_sas_or_url).query if "?" in full_sas_or_url else full_sas_or_url
    qs = parse_qs(query)
    sip = qs.get("sip", [])
    if any(v.strip() == "0.0.0.0" for v in sip):
        print(
            "⚠️  SAS Anda berisi sip=0.0.0.0 → semua akses akan ditolak.\n"
            "    Regenerasi SAS tanpa IP range (hapus sip) atau isi IP publik Anda yang benar.\n",
            file=sys.stderr
        )

def download_with_sdk(file_url: str, out_path: str):
    """Download memakai azure-storage-file-share SDK."""
    print("Mengunduh via SDK dari:", file_url)
    try:
        client = ShareFileClient.from_file_url(file_url)
        data = client.download_file().readall()
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"Sukses. Tersimpan: {out_path} ({len(data)} bytes)")
    except HttpResponseError as e:
        print("\nGagal (SDK):", e)
        # tampilkan detail jika ada
        try:
            print("Status:", e.status_code, "ErrorCode:", e.error_code)
        except Exception:
            pass
        print("Pesan:", getattr(e, "message", str(e)))
        raise

def download_with_requests(file_url: str, out_path: str):
    """Download memakai HTTP biasa (tanpa SDK)."""
    print("Mengunduh via HTTP dari:", file_url)
    r = requests.get(file_url, timeout=60)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        f.write(r.content)
    print(f"Sukses. Tersimpan: {out_path} ({len(r.content)} bytes)")

def main():
    file_url = join_url_and_sas(FILE_URL_BASE, SAS_TOKEN)
    warn_if_bad_sip(file_url)  # beri peringatan kalau ada sip=0.0.0.0

    # Nama file output lokal
    local_name = os.path.basename(urlparse(FILE_URL_BASE).path) or "downloaded_file"
    out_path = f"./downloaded_{local_name}"

    # Coba SDK dulu; kalau gagal, coba requests
    try:
        download_with_sdk(file_url, out_path)
    except Exception:
        print("\nMencoba fallback via HTTP (requests)...")
        download_with_requests(file_url, out_path)

if __name__ == "__main__":
    main()
