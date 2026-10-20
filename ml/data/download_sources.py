import csv
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RAW_DIR = Path("data/raw")


def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            h.update(chunk)
    return h.hexdigest()


def download_file(url, out_path, max_size=100 * 1024 * 1024, max_retries=2):
    for attempt in range(max_retries + 1):
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=60) as response:
                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > max_size:
                    return False, f"Exceeds cap ({int(content_length)} bytes)"

            out_path.parent.mkdir(parents=True, exist_ok=True)

            headers = {}
            if out_path.exists():
                existing_size = out_path.stat().st_size
                if content_length and existing_size == int(content_length):
                    return True, "Already downloaded"
                headers["Range"] = f"bytes={existing_size}-"
                mode = "ab"
            else:
                mode = "wb"

            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response:
                with open(out_path, mode) as f:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        f.write(chunk)
                        if out_path.stat().st_size > max_size:
                            return False, "Exceeds cap during download"
            return True, "Downloaded"
        except Exception as e:
            if attempt == max_retries:
                return False, f"Failed: {e}"
            time.sleep(1)


def get_data_info(filepath):
    ext = filepath.suffix.lower()
    try:
        if ext == ".parquet":
            import pandas as pd

            df = pd.read_parquet(filepath)
            return len(df), ", ".join(str(c) for c in df.columns)
        elif ext == ".csv":
            with open(filepath, encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader)
                rows = 1 + sum(1 for _ in reader)
                return rows, ", ".join(header)
        elif ext in [".json", ".jsonl"]:
            with open(filepath, encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        data = json.loads(line)
                        # Assuming it's a list or dict
                        if isinstance(data, list) and data:
                            return len(data), ", ".join(data[0].keys())
                        elif isinstance(data, dict):
                            # Count lines for jsonl
                            f.seek(0)
                            rows = sum(1 for ln in f if ln.strip())
                            return rows, ", ".join(data.keys())
    except Exception:
        pass
    return "N/A", "N/A"


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    hf_sources = [
        {"id": "deepset/prompt-injections", "license": "Apache-2.0", "label_col": "label"},
        {"id": "jackhhao/jailbreak-classification", "license": "Apache-2.0", "label_col": "type"},
        {
            "id": "hackaprompt/hackaprompt-dataset",
            "license": "MIT",
            "label_col": "expected_completion",
        },
        {"id": "OpenAssistant/oasst1", "license": "Apache-2.0", "label_col": "None (benign)"},
    ]

    manifest = {}
    report = []

    for src in hf_sources:
        ds_id = src["id"]
        safe_id = ds_id.replace("/", "_")
        out_dir = RAW_DIR / safe_id

        try:
            tree_url = f"https://huggingface.co/api/datasets/{ds_id}/tree/main?recursive=true"
            req = urllib.request.Request(tree_url)
            with urllib.request.urlopen(req, timeout=60) as resp:
                tree = json.loads(resp.read())

            data_files = [
                f
                for f in tree
                if f["type"] == "file"
                and any(f["path"].endswith(ext) for ext in [".parquet", ".json", ".jsonl", ".csv"])
            ]

            if ds_id == "hackaprompt/hackaprompt-dataset" and data_files:
                data_files = [data_files[0]]

            if not data_files:
                report.append(
                    {
                        "Source": ds_id,
                        "Rows": "-",
                        "Columns": "-",
                        "Label Column": src["label_col"],
                        "License": src["license"],
                        "Status": "No data files found",
                    }
                )
                continue

            success_files = []
            rows = 0
            cols = ""

            for f in data_files:
                path = f["path"]
                url = (
                    f"https://huggingface.co/datasets/{ds_id}/resolve/main/"
                    f"{urllib.parse.quote(path)}?download=true"
                )
                out_path = out_dir / path
                if out_path.exists():
                    success, msg = True, "Already downloaded"
                else:
                    success, msg = download_file(url, out_path)

                if success:
                    success_files.append(out_path)
                    r, c = get_data_info(out_path)

                    if isinstance(r, int):
                        rows += r
                    if c != "N/A" and not cols:
                        cols = c
                else:
                    if ds_id == "hackaprompt/hackaprompt-dataset":
                        report.append(
                            {
                                "Source": ds_id,
                                "Rows": "-",
                                "Columns": "-",
                                "Label Column": src["label_col"],
                                "License": src["license"],
                                "Status": msg,
                            }
                        )
                        break

            if ds_id == "hackaprompt/hackaprompt-dataset" and not success_files:
                continue

            if success_files:
                manifest[ds_id] = {
                    "dataset_id": ds_id,
                    "revision": "main",
                    "license": src["license"],
                    "row_count": rows,
                    "columns": cols,
                    "sha256": get_sha256(success_files[0]),
                }
                report.append(
                    {
                        "Source": ds_id,
                        "Rows": str(rows),
                        "Columns": cols,
                        "Label Column": src["label_col"],
                        "License": src["license"],
                        "Status": "Success",
                    }
                )
            else:
                report.append(
                    {
                        "Source": ds_id,
                        "Rows": "-",
                        "Columns": "-",
                        "Label Column": src["label_col"],
                        "License": src["license"],
                        "Status": "Failed to download any file",
                    }
                )

        except Exception as e:
            report.append(
                {
                    "Source": ds_id,
                    "Rows": "-",
                    "Columns": "-",
                    "Label Column": src["label_col"],
                    "License": src["license"],
                    "Status": f"Failed: {e}",
                }
            )

    # BIPIA
    try:
        ds_id = "microsoft/BIPIA"
        out_dir = RAW_DIR / "BIPIA"
        url = "https://github.com/microsoft/BIPIA/archive/refs/heads/main.zip"
        out_path = out_dir / "main.zip"

        if out_path.exists():
            success, msg = True, "Already downloaded"
        else:
            success, msg = download_file(url, out_path)

        if success:
            manifest[ds_id] = {
                "dataset_id": ds_id,
                "revision": "main",
                "license": "MIT",
                "row_count": "N/A",
                "columns": "N/A",
                "sha256": get_sha256(out_path),
            }
            # Check if there are data files inside



            report.append(
                {
                    "Source": ds_id,
                    "Rows": "N/A",
                    "Columns": "N/A",
                    "Label Column": "N/A",
                    "License": "MIT",
                    "Status": "Success (GitHub ZIP). Data files are scattered " \
                    "in repo, needs parsing step.",
                }
            )
        else:
            report.append(
                {
                    "Source": ds_id,
                    "Rows": "-",
                    "Columns": "-",
                    "Label Column": "N/A",
                    "License": "MIT",
                    "Status": msg,
                }
            )

    except Exception as e:
        report.append(
            {
                "Source": "microsoft/BIPIA",
                "Rows": "-",
                "Columns": "-",
                "Label Column": "N/A",
                "License": "MIT",
                "Status": f"Failed: {e}",
            }
        )

    with open(RAW_DIR / "MANIFEST.json", "w") as f:
        json.dump(manifest, f, indent=2)

    print("\n--- REPORT ---")
    print("| Source | Rows | Columns | Label Column | License | Status |")
    print("|---|---|---|---|---|---|")
    for r in report:
        print(
            f"| {r['Source']} | {r['Rows']} | {r['Columns']} | " \
            f"{r['Label Column']} | {r['License']} | {r['Status']} |"
        )


if __name__ == "__main__":
    main()
