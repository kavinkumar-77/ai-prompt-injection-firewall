from ml.data.pipeline import run_pipeline

stats = run_pipeline()

splits = stats.get("splits_raw", {})

print("\n--- a) Rows per split x label x kind ---")
for split_name, split_rows in splits.items():
    counts = {}
    for r in split_rows:
        key = (r["label"], r.get("kind", "unknown"))
        counts[key] = counts.get(key, 0) + 1
    for k, v in counts.items():
        print(f"{split_name} | label={k[0]} | kind={k[1]}: {v}")

print(
    "\n--- b) Test negatives: real benign vs hard negatives, and hard negatives per category per split ---"
)
test_neg = [r for r in splits.get("test", []) if r["label"] == 0]
test_hard_neg = sum(1 for r in test_neg if r["source"] == "synthetic_hard_negatives_v1")
test_real_benign = len(test_neg) - test_hard_neg
print(f"Test Negatives -> Real Benign: {test_real_benign} | Hard Negatives: {test_hard_neg}")
for split_name, split_rows in splits.items():
    cat_counts = {}
    for r in split_rows:
        if r["label"] == 0 and r["source"] == "synthetic_hard_negatives_v1":
            cat = r["attack_family"]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    for cat, v in cat_counts.items():
        print(f"{split_name} | {cat}: {v}")

print("\n--- c) Positives per attack_family per split ---")
for split_name, split_rows in splits.items():
    fam_counts = {}
    for r in split_rows:
        if r["label"] == 1:
            fam = r["attack_family"]
            fam_counts[fam] = fam_counts.get(fam, 0) + 1
    for fam, v in fam_counts.items():
        print(f"{split_name} | {fam}: {v}")

print("\n--- d) Dedupe removals per source ---")
if "dedupe_report" in stats:
    for source, s_report in stats["dedupe_report"].get("per_source", {}).items():
        ex = s_report.get("exact_dupes_removed", 0)
        nr = s_report.get("near_dupes_removed", 0)
        if ex > 0 or nr > 0:
            print(f"{source} | Exact: {ex} | Near: {nr}")
