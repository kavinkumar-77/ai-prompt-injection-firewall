import re
from pathlib import Path

from ml.data.pipeline import run_pipeline


def generate_card():
    stats = run_pipeline()
    splits = stats.get("splits_raw", {})

    # Calculate stats
    train_pos = sum(1 for r in splits.get("train", []) if r["label"] == 1)
    train_neg = sum(1 for r in splits.get("train", []) if r["label"] == 0)
    train_tot = train_pos + train_neg

    val_pos = sum(1 for r in splits.get("val", []) if r["label"] == 1)
    val_neg = sum(1 for r in splits.get("val", []) if r["label"] == 0)
    val_tot = val_pos + val_neg

    test_pos = sum(1 for r in splits.get("test", []) if r["label"] == 1)
    test_neg = sum(1 for r in splits.get("test", []) if r["label"] == 0)
    test_tot = test_pos + test_neg

    total_pos = train_pos + val_pos + test_pos
    total_neg = train_neg + val_neg + test_neg
    total_rows = total_pos + total_neg

    train_dir = sum(1 for r in splits.get("train", []) if r["label"] == 1 and r["kind"] == "direct")
    train_indir = sum(1 for r in splits.get("train", []) if r["label"] == 1 and r["kind"] == "indirect")
    val_dir = sum(1 for r in splits.get("val", []) if r["label"] == 1 and r["kind"] == "direct")
    val_indir = sum(1 for r in splits.get("val", []) if r["label"] == 1 and r["kind"] == "indirect")
    test_dir = sum(1 for r in splits.get("test", []) if r["label"] == 1 and r["kind"] == "direct")
    test_indir = sum(1 for r in splits.get("test", []) if r["label"] == 1 and r["kind"] == "indirect")

    tot_dir = train_dir + val_dir + test_dir
    tot_indir = train_indir + val_indir + test_indir

    card_path = Path("ml/data/DATASET_CARD.md")
    content = card_path.read_text(encoding="utf-8")

    # Update Total Processed Samples
    content = re.sub(r'\*\*Total Processed Samples\*\*: .*', f'**Total Processed Samples**: {total_rows:,} (after deduplication and quality filtering)', content)

    # Update Train Split
    content = re.sub(r'\*\*Train Split\*\*: .*', f'**Train Split**: {train_tot:,} samples ({train_pos:,} positives, {train_neg:,} negatives)', content)

    # Update Validation Split
    content = re.sub(r'\*\*Validation Split\*\*: .*', f'**Validation Split**: {val_tot:,} samples ({val_pos:,} positives, {val_neg:,} negatives)', content)

    # Update Test Split
    content = re.sub(r'\*\*Test Split\*\*: .*', f'**Test Split**: {test_tot:,} samples ({test_pos:,} positives, {test_neg:,} negatives)', content)
    content = re.sub(r'\*\*Negatives in Test\*\*: [\d,]+', f'**Negatives in Test**: {test_neg:,}', content)

    # Table replacement
    new_table = f'''| Split | Positives (label: 1) | Negatives (label: 0) | Total Rows | Direct Attacks | Indirect Attacks | Benign / Hard Negatives |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Train** | {train_pos:,} | {train_neg:,} | {train_tot:,} | {train_dir:,} | {train_indir:,} | {train_neg:,} |
| **Validation** | {val_pos:,} | {val_neg:,} | {val_tot:,} | {val_dir:,} | {val_indir:,} | {val_neg:,} |
| **Test** | {test_pos:,} | {test_neg:,} | {test_tot:,} | {test_dir:,} | {test_indir:,} | {test_neg:,} |
| **Total** | **{total_pos:,}** | **{total_neg:,}** | **{total_rows:,}** | **{tot_dir:,}** | **{tot_indir:,}** | **{total_neg:,}** |'''

    content = re.sub(r'\| Split \| Positives \(label: 1\) \| .*?\| \*\*Total\*\* \| \*\*[\d,]+\*\* \| \*\*[\d,]+\*\* \| \*\*[\d,]+\*\* \| \*\*[\d,]+\*\* \| \*\*[\d,]+\*\* \| \*\*[\d,]+\*\* \|', new_table, content, flags=re.DOTALL)

    card_path.write_text(content, encoding="utf-8")
    print(f"Updated DATASET_CARD.md with {total_rows} total rows.")
    return stats

if __name__ == "__main__":
    generate_card()
