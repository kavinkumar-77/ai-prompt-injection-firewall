"""Asset fetcher and verification utility for Project AEGIS.

Adheres strictly to Rule 4:
- All asset retrieval goes through this script
- Backoff retries on network calls
- Local mirror support via AEGIS_ASSET_DIR
- Strict SHA-256 verification against data/raw/MANIFEST.json and models/MANIFEST.json
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parent.parent


def compute_sha256(path: Path) -> str:
    """Computes SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def fetch_file(url: str, dest: Path, expected_sha256: str, max_retries: int = 3) -> bool:
    """Fetches a file with exponential backoff and SHA-256 verification."""
    mirror_dir = os.environ.get("AEGIS_ASSET_DIR")
    if mirror_dir:
        mirror_path = Path(mirror_dir) / dest.name
        if mirror_path.is_file():
            print(f"[*] Found in AEGIS_ASSET_DIR mirror: {mirror_path}")
            shutil.copy2(mirror_path, dest)
            digest = compute_sha256(dest)
            if digest == expected_sha256:
                print(f"[✓] Verified SHA-256 from mirror: {dest.name}")
                return True
            print(f"[!] Mirror checksum mismatch for {dest.name}")

    dest.parent.mkdir(parents=True, exist_ok=True)

    delay = 2.0
    for attempt in range(1, max_retries + 1):
        try:
            print(f"[*] Downloading {dest.name} (attempt {attempt}/{max_retries})...")
            req = Request(url, headers={"User-Agent": "AEGIS-AssetFetcher/1.0"})
            with urlopen(req, timeout=30) as response, open(dest, "wb") as out:
                shutil.copyfileobj(response, out)

            digest = compute_sha256(dest)
            if digest == expected_sha256:
                print(f"[OK] Downloaded and verified SHA-256: {dest.name}")
                return True
            else:
                print(
                    f"[!] Checksum mismatch for {dest.name} "
                    f"(got {digest}, expected {expected_sha256})"
                )
                dest.unlink(missing_ok=True)
        except Exception as e:
            print(f"[!] Attempt {attempt} failed: {e}")
            dest.unlink(missing_ok=True)

        if attempt < max_retries:
            print(f"[*] Retrying in {delay:.1f}s...")
            time.sleep(delay)
            delay *= 2.0

    return False


def verify_manifest(manifest_path: Path) -> bool:
    """Verifies that all entries in a manifest file exist and match their expected hashes."""
    if not manifest_path.is_file():
        print(f"[!] Manifest not found: {manifest_path}")
        return False

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    all_ok = True
    for item in manifest.get("assets", []):
        rel_path = item.get("path")
        expected_sha = item.get("sha256")
        target_path = ROOT_DIR / rel_path

        if not target_path.is_file():
            print(f"[x] Missing asset: {rel_path}")
            all_ok = False
            continue

        actual_sha = compute_sha256(target_path)
        if actual_sha == expected_sha:
            print(f"[✓] {rel_path} matches SHA-256")
        else:
            print(f"[x] {rel_path} HASH MISMATCH! Actual: {actual_sha}, Expected: {expected_sha}")
            all_ok = False

    return all_ok


if __name__ == "__main__":
    raw_manifest = ROOT_DIR / "data" / "raw" / "MANIFEST.json"
    models_manifest = ROOT_DIR / "models" / "MANIFEST.json"

    print("=== Verifying Assets Manifests ===")
    raw_ok = verify_manifest(raw_manifest) if raw_manifest.exists() else True
    models_ok = verify_manifest(models_manifest) if models_manifest.exists() else True

    if raw_ok and models_ok:
        print("[✓] All manifested assets verified successfully.")
        sys.exit(0)
    else:
        print("[!] Asset verification failed.")
        sys.exit(1)
