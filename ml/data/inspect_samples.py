"""Inspect dataset samples (prints 10 random rows per split and label)."""

import json
import random
from collections import defaultdict
from pathlib import Path


def inspect_samples(data_dir: str = "data/processed", seed: int = 42) -> None:
    rng = random.Random(seed)

    for split in ["train", "val", "test"]:
        file_path = Path(data_dir) / f"{split}.jsonl"
        if not file_path.is_file():
            print(f"Split {split} not found at {file_path}")
            continue

        by_label = defaultdict(list)
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                if not line.strip():
                    continue
                record = json.loads(line)
                by_label[record["label"]].append(record)

        print(f"\n{'=' * 50}\nSplit: {split.upper()}\n{'=' * 50}")
        for label in sorted(by_label.keys()):
            print(f"\n--- Label: {label} ---")
            samples = by_label[label]
            rng.shuffle(samples)

            for i, record in enumerate(samples[:10]):
                text = record["text"]
                if len(text) > 300:
                    text = text[:300] + "..."
                kind = record.get("kind", "unknown")
                source = record.get("source", "unknown")
                fam = record.get("attack_family", "unknown")
                print(
                    f"{i + 1:2d}. [kind={kind} | fam={fam} | src={source}]\n    Text: {repr(text)}"
                )


if __name__ == "__main__":
    inspect_samples()
