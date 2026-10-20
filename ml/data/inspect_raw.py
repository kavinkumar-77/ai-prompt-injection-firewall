import zipfile
from pathlib import Path

import pandas as pd


def inspect():
    raw_dir = Path("data/raw")
    print("=== deepset ===")
    p = raw_dir / "deepset_prompt-injections"
    files = list(p.rglob("*")) if p.exists() else []
    print("Files:", [f.name for f in files if f.is_file()])
    if files:
        df = (
            pd.read_parquet(p / "data/train-00000-of-00001-9564e8b05b4757ab.parquet")
            if (p / "data/train-00000-of-00001-9564e8b05b4757ab.parquet").exists()
            else pd.DataFrame()
        )  # noqa: E501
        if not df.empty:
            print("Rows:", len(df), "Cols:", list(df.columns))
            print("Labels:", df["label"].value_counts().to_dict())
            print("Exact dupes:", df.duplicated().sum())
            print("Lang mix: likely English")
            print("Sample:")
            for _, r in df.sample(3).iterrows():
                print(str(r.to_dict())[:200])

    print("\n=== jackhhao ===")
    p = raw_dir / "jackhhao_jailbreak-classification"
    files = list(p.rglob("*")) if p.exists() else []
    print("Files:", [f.name for f in files if f.is_file()])
    if files:
        dfs = []
        for f in files:
            if f.name.endswith(".parquet"):
                dfs.append(pd.read_parquet(f))
        if dfs:
            df = pd.concat(dfs)
            print("Rows:", len(df), "Cols:", list(df.columns))
            print("Labels:", df["type"].value_counts().to_dict())
            print("Exact dupes:", df.duplicated().sum())
            print("Lang mix: likely English")
            print("Sample:")
            for _, r in df.sample(3).iterrows():
                print(str(r.to_dict())[:200])

    print("\n=== oasst1 ===")
    p = raw_dir / "OpenAssistant_oasst1"
    files = list(p.rglob("*")) if p.exists() else []
    print("Files:", [f.name for f in files if f.is_file()])
    if files:
        dfs = []
        for f in files:
            if f.name.endswith(".parquet"):
                dfs.append(pd.read_parquet(f))
        if dfs:
            df = pd.concat(dfs)
            print("Rows:", len(df))
            eng_prompter = df[(df["lang"] == "en") & (df["role"] == "prompter")]
            print("English prompter rows:", len(eng_prompter))
            print("Sample:")
            for _, r in eng_prompter.sample(3).iterrows():
                print(str(r.to_dict())[:200])

    print("\n=== BIPIA ===")
    p = raw_dir / "BIPIA" / "main.zip"
    if p.exists():
        with zipfile.ZipFile(p, "r") as z:
            names = z.namelist()
            print("Files in ZIP:", len(names))
            train = [n for n in names if "train" in n.lower()]
            test = [n for n in names if "test" in n.lower()]
            print("Train files:", train[:3], "...")
            print("Test files:", test[:3], "...")
            # finding email/web/QA
            email = [n for n in names if "email" in n.lower()]
            web = [n for n in names if "web" in n.lower()]
            qa = [n for n in names if "qa" in n.lower()]
            print("Contexts found:", len(email), "email,", len(web), "web,", len(qa), "QA")
            attacks = [n for n in names if "attack" in n.lower()]
            print("Attacks found:", len(attacks))
            print("Sample attack list file:", attacks[0] if attacks else "None")
            if attacks:
                print("Format snippet:", z.read(attacks[0])[:200].decode("utf-8", errors="ignore"))


if __name__ == "__main__":
    inspect()
