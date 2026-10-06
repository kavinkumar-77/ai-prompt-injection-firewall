"""Deduplication engine with paired-group preservation.

Performs exact hash deduplication and MinHash/Jaccard near-duplicate removal
strictly WITHIN each label class. Ensures paired members of the same group_id
(e.g., clean context vs injected context) are never compared or pruned.
"""

import hashlib
import re
from typing import Any


def _normalize_text(text: str) -> str:
    """Collapses whitespace and lowercases text for deduplication."""
    return re.sub(r"\s+", " ", text).strip().lower()


def _get_shingles(text: str, k: int = 2) -> set[str]:
    """Generates word k-shingles for Jaccard similarity estimation."""
    words = _normalize_text(text).split()
    if len(words) < k:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i : i + k]) for i in range(len(words) - k + 1)}


def _jaccard_similarity(s1: set[str], s2: set[str]) -> float:
    if not s1 or not s2:
        return 0.0
    intersection = len(s1.intersection(s2))
    union = len(s1.union(s2))
    return intersection / union if union > 0 else 0.0


def deduplicate_records(
    records: list[dict[str, Any]],
    jaccard_threshold: float = 0.85,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Deduplicates records within label classes while preserving paired group members.

    Args:
        records: List of normalized record dictionaries.
        jaccard_threshold: Threshold above which two texts within the same label
            are deemed near-duplicates.

    Returns:
        Tuple of (clean_records, dedupe_report).
    """
    report = {
        "exact_dupes_removed": 0,
        "near_dupes_removed": 0,
        "per_source": {},
        "per_category": {},
    }

    # Separate records by label to guarantee zero cross-label collision
    by_label: dict[int, list[dict[str, Any]]] = {0: [], 1: []}
    for r in records:
        lbl = r.get("label", 0)
        by_label.setdefault(lbl, []).append(r)

    retained_records: list[dict[str, Any]] = []

    for lbl, group_records in by_label.items():
        seen_exact_hashes: set[str] = set()
        seen_groups: set[str] = set()
        retained_shingles_by_group: list[tuple[str, set[str]]] = []

        for r in group_records:
            text = r.get("text", "")

            source = r.get("source", "unknown")
            cat = r.get("attack_family", "unknown")

            def add_stat(stat_type, source=source, cat=cat):
                report[stat_type] += 1
                report["per_source"].setdefault(source, {}).setdefault(stat_type, 0)
                report["per_source"][source][stat_type] += 1
                report["per_category"].setdefault(cat, {}).setdefault(stat_type, 0)
                report["per_category"][cat][stat_type] += 1

            group_id = r.get("group_id", "")
            norm = _normalize_text(text)
            text_hash = hashlib.sha256(norm.encode("utf-8")).hexdigest()

            # 1. Exact deduplication within same label
            if text_hash in seen_exact_hashes:
                add_stat("exact_dupes_removed")
                continue

            # If same group_id already has a row with the exact same label, skip
            group_key = f"{lbl}_{group_id}"
            if group_id and group_key in seen_groups:
                add_stat("exact_dupes_removed")
                continue

            # 2. Near-duplicate check (MinHash/Jaccard) within same label
            shingles = _get_shingles(norm, k=4)
            is_near_dup = False

            for existing_group_id, existing_shingles in retained_shingles_by_group:
                # Do not check against the same group (paired rows are preserved)
                if group_id and existing_group_id == group_id:
                    continue

                sim = _jaccard_similarity(shingles, existing_shingles)
                if sim >= jaccard_threshold:
                    is_near_dup = True
                    break

            if is_near_dup:
                add_stat("near_dupes_removed")
                continue

            # Record is unique: retain it
            seen_exact_hashes.add(text_hash)
            if group_id:
                seen_groups.add(group_key)
            retained_shingles_by_group.append((group_id, shingles))
            retained_records.append(r)

    # Restore original record order where possible
    retained_ids = {r["id"] for r in retained_records}
    ordered_clean = [r for r in records if r["id"] in retained_ids]

    return ordered_clean, report


class DataCleaner:
    """Object-oriented wrapper around deduplicate_records."""

    def __init__(self, near_dedupe_threshold: float = 0.85) -> None:
        self.near_dedupe_threshold = near_dedupe_threshold

    def clean(self, records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int]]:
        clean_recs, dedupe_report = deduplicate_records(
            records, jaccard_threshold=self.near_dedupe_threshold
        )
        # Map keys for backward compatibility in DataCleaner
        cleaner_report = {
            "exact_duplicates_removed": dedupe_report["exact_dupes_removed"],
            "near_duplicates_removed": dedupe_report["near_dupes_removed"],
        }
        return clean_recs, cleaner_report
