"""Main dataset compilation pipeline for Dataset v1.

Reproducible, config-driven, deterministic (seed 42).
Loads approved sources, synthesizes disjoint hard negatives and synthetic embedded
injections, safely deduplicates, verifies zero PII, and outputs partitioned JSONL files.
"""

import json
import os
from pathlib import Path
from typing import Any

from ml.data.cleaner import deduplicate_records
from ml.data.hard_negatives import generate_hard_negatives_for_split
from ml.data.safety import validate_dataset_records
from ml.data.sources import (
    load_bipia_samples,
    load_deepset_samples,
    load_genre_matched_benign,
    load_hackaprompt_held_out,
    load_jackhhao_samples,
)
from ml.data.splitter import partition_dataset
from ml.data.synthetic_embedded import generate_synthetic_embedded_pairs


def run_pipeline(
    output_dir: str = "data/processed",
    fixture_dir: str = "ml/tests/fixtures",
    seed: int = 42,
) -> dict[str, Any]:
    """Executes the Dataset v1 compilation pipeline."""
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(fixture_dir, exist_ok=True)

    # 1. Ingest approved public sources with strict caps
    raw_records: list[dict[str, Any]] = []
    raw_records.extend(load_deepset_samples(cap=660, seed=seed))
    raw_records.extend(load_jackhhao_samples(cap=1000, seed=seed))
    raw_records.extend(load_bipia_samples(train_cap=1200, test_cap=1200, seed=seed))
    raw_records.extend(load_hackaprompt_held_out(cap=1400, seed=seed))
    raw_records.extend(load_genre_matched_benign(total_count=2500, seed=seed))

    # 2. Add Hard Negatives (disjoint templates per split)
    raw_records.extend(generate_hard_negatives_for_split("train", target_count=750, seed=seed))
    raw_records.extend(generate_hard_negatives_for_split("val", target_count=250, seed=seed))
    raw_records.extend(generate_hard_negatives_for_split("test", target_count=300, seed=seed))

    # 3. Add Synthetic Embedded Injections (paired groups, disjoint payloads)
    raw_records.extend(generate_synthetic_embedded_pairs("train", pair_count=300, seed=seed))
    raw_records.extend(generate_synthetic_embedded_pairs("val", pair_count=100, seed=seed))
    raw_records.extend(generate_synthetic_embedded_pairs("test", pair_count=150, seed=seed))

    total_ingested = len(raw_records)

    # 4. Safe Deduplication (preserves paired group_id rows)
    clean_records, exact_dupes_removed, near_dupes_removed = deduplicate_records(
        raw_records, jaccard_threshold=0.88
    )

    # 5. Safety & PII Sanitization
    sanitized_records, pii_sanitized_count = validate_dataset_records(clean_records)

    # 6. Partitioning (preserves paired group co-location & holds out HackAPrompt)
    splits = partition_dataset(
        sanitized_records,
        held_out_sources=["hackaprompt/hackaprompt-dataset"],
        min_benign_test_samples=1500,
    )

    # 7. Write output JSONL files
    summary_stats: dict[str, Any] = {
        "total_ingested": total_ingested,
        "exact_dupes_removed": exact_dupes_removed,
        "near_dupes_removed": near_dupes_removed,
        "total_cleaned": len(sanitized_records),
        "pii_sanitized_count": pii_sanitized_count,
        "splits": {},
        "families": set(),
        "kinds": {"direct": 0, "indirect": 0, "unknown": 0},
    }

    for split_name, split_rows in splits.items():
        file_path = Path(output_dir) / f"{split_name}.jsonl"
        with open(file_path, "w", encoding="utf-8") as f:
            for row in split_rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

        pos_count = sum(1 for r in split_rows if r["label"] == 1)
        neg_count = sum(1 for r in split_rows if r["label"] == 0)

        summary_stats["splits"][split_name] = {
            "total": len(split_rows),
            "positives": pos_count,
            "negatives": neg_count,
        }

        for r in split_rows:
            summary_stats["families"].add(r.get("attack_family", "unknown"))
            k = r.get("kind", "unknown")
            summary_stats["kinds"][k] = summary_stats["kinds"].get(k, 0) + 1

    summary_stats["families"] = sorted(list(summary_stats["families"]))

    # 8. Write a tiny sample fixture (18 rows: balanced train/val/test, pos/neg)
    sample_rows: list[dict[str, Any]] = []
    for split_name in ["train", "val", "test"]:
        rows = splits[split_name]
        pos = [r for r in rows if r["label"] == 1][:3]
        neg = [r for r in rows if r["label"] == 0][:3]
        sample_rows.extend(pos + neg)

    sample_fixture_path = Path(fixture_dir) / "sample_v1.jsonl"
    with open(sample_fixture_path, "w", encoding="utf-8") as f:
        for r in sample_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    return summary_stats


if __name__ == "__main__":
    stats = run_pipeline()
    print("Pipeline Execution Complete!")
    print(f"Total Ingested: {stats['total_ingested']}")
    print(
        f"Deduplication: {stats['exact_dupes_removed']} exact, "
        f"{stats['near_dupes_removed']} near-dupes removed"
    )
    print(f"Splits: {stats['splits']}")
