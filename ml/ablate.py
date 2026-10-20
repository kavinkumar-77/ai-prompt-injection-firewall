"""Ablation study evaluating incremental defense layer contributions.

Compares:
1. Rules Only
2. Rules + Legacy TF-IDF
3. Rules + Trained ML Model
4. Full AEGIS Pipeline (Normalizer + Rules + Trained ML + Context)
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.metrics import f1_score, precision_score, recall_score

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.models import ScanRequest  # noqa: E402
from app.core.pipeline import AegisPipeline  # noqa: E402
from app.layers.classifier import ClassifierLayer  # noqa: E402
from app.layers.legacy_tfidf import legacy_tfidf_engine  # noqa: E402
from app.layers.rules import RulesLayer  # noqa: E402


def run_ablation(test_path: str = "data/processed/test.jsonl") -> dict[str, Any]:
    """Runs ablation evaluation across all 4 configurations."""
    test_file = ROOT_DIR / test_path
    print(f"[*] Loading test set from: {test_file}")

    texts = []
    labels = []
    records = []
    with open(test_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            texts.append(rec["text"])
            labels.append(int(rec["label"]))
            records.append(rec)

    y_true = np.array(labels)
    total_samples = len(texts)
    hard_neg_indices = [
        i
        for i, r in enumerate(records)
        if "hard_negative" in r.get("attack_family", "")
        or r.get("source") == "synthetic_hard_negatives_v1"
    ]
    hard_neg_count = len(hard_neg_indices)
    pos_count = int(np.sum(y_true == 1))
    neg_count = int(np.sum(y_true == 0))
    print(
        f"[*] Evaluated on {total_samples} samples ({pos_count} pos, {neg_count} neg, "
        f"{hard_neg_count} hard negs)"
    )

    rules_layer = RulesLayer()
    ml_layer = ClassifierLayer()
    full_pipeline = AegisPipeline()

    configs = ["rules_only", "rules_plus_legacy_tfidf", "rules_plus_ml", "full_pipeline"]
    results = {}

    for cfg in configs:
        print(f"[*] Evaluating configuration: {cfg}...")
        preds = []
        start_time = time.perf_counter()

        for text, r in zip(texts, records, strict=True):
            trust_source = "retrieved" if "bipia" in r.get("attack_family", "") else "user"

            if cfg == "rules_only":
                res = rules_layer.process(text)
                is_attack = res.score >= 0.70
            elif cfg == "rules_plus_legacy_tfidf":
                r_res = rules_layer.process(text)
                tf_res = legacy_tfidf_engine.analyze_semantic_vector(text)
                score = max(r_res.score, float(tf_res.get("max_similarity", 0.0)))
                is_attack = score >= 0.50
            elif cfg == "rules_plus_ml":
                r_res = rules_layer.process(text)
                ml_res = ml_layer.process(text)
                score = max(r_res.score, ml_res.score)
                is_attack = score >= 0.50
            elif cfg == "full_pipeline":
                req = ScanRequest(text=text, source=trust_source)
                pipe_res = full_pipeline.scan(req)
                is_attack = pipe_res.verdict == "block"

            preds.append(1 if is_attack else 0)

        elapsed = time.perf_counter() - start_time
        y_pred = np.array(preds)

        p = float(precision_score(y_true, y_pred, zero_division=0))
        r = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))

        hn_preds = y_pred[hard_neg_indices] if hard_neg_indices else np.array([])
        hn_fpr = float(np.sum(hn_preds == 1) / hard_neg_count) if hard_neg_count > 0 else 0.0
        avg_lat = (elapsed / total_samples) * 1000

        results[cfg] = {
            "precision": round(p, 4),
            "recall": round(r, 4),
            "f1": round(f1, 4),
            "hard_negative_fpr": round(hn_fpr, 4),
            "avg_latency_ms": round(avg_lat, 3),
        }

    reports_dir = ROOT_DIR / "ml" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    out_file = reports_dir / "ablation.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    header = (
        f"| {'Configuration':<28} | {'Precision':<9} | {'Recall':<8} | "
        f"{'F1':<8} | {'HN FPR':<8} | {'Latency':<8} |"
    )
    divider = f"|{'-' * 30}|{'-' * 11}|{'-' * 10}|{'-' * 10}|{'-' * 10}|{'-' * 10}|"
    print("\n================== ABLATION STUDY RESULTS ==================")
    print(header)
    print(divider)
    for name, m in results.items():
        p_str = f"{m['precision']:<9.4f}"
        r_str = f"{m['recall']:<8.4f}"
        f_str = f"{m['f1']:<8.4f}"
        hn_str = f"{m['hard_negative_fpr']:<8.4%}"
        lat_str = f"{m['avg_latency_ms']:<6.2f}ms"
        print(f"| {name:<28} | {p_str} | {r_str} | {f_str} | {hn_str} | {lat_str} |")
    print("============================================================")
    print(f"[OK] Saved ablation report to: {out_file}")

    return results


if __name__ == "__main__":
    run_ablation()
