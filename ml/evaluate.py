"""Comprehensive evaluation script for Project AEGIS classifiers.

Evaluates test split, unseen held-out attacks, hard-negative FPR, operating thresholds,
per-subtype metrics, and writes ml/reports/metrics.json and confusion matrix plot.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import joblib
import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

matplotlib.use("Agg")  # Headless backend for hermetic plotting

ROOT_DIR = Path(__file__).resolve().parent.parent


def evaluate_classifier(
    model_path: str = "models/classifier.joblib",
    test_path: str = "data/processed/test.jsonl",
    reports_dir: str = "ml/reports",
) -> dict[str, Any]:
    """Runs full evaluation and produces verified metrics."""
    reports_path = ROOT_DIR / reports_dir
    reports_path.mkdir(parents=True, exist_ok=True)

    print(f"[*] Loading model from: {ROOT_DIR / model_path}")
    pipeline = joblib.load(ROOT_DIR / model_path)

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
    pos_count = int(np.sum(y_true == 1))
    neg_count = int(np.sum(y_true == 0))
    print(f"[*] Total test samples: {len(texts)} ({pos_count} pos, {neg_count} neg)")

    # 1. Predictions and Probability Calibration
    print("[*] Running inference across test set...")
    start_time = time.perf_counter()
    y_probs = pipeline.predict_proba(texts)[:, 1]
    total_eval_time = time.perf_counter() - start_time
    avg_latency_ms = (total_eval_time / len(texts)) * 1000

    y_pred_default = (y_probs >= 0.50).astype(int)

    # 2. Global Metrics
    precision = float(precision_score(y_true, y_pred_default))
    recall = float(recall_score(y_true, y_pred_default))
    f1 = float(f1_score(y_true, y_pred_default))
    roc_auc = float(roc_auc_score(y_true, y_probs))
    pr_auc = float(average_precision_score(y_true, y_probs))

    cm = confusion_matrix(y_true, y_pred_default)
    tn, fp, fn, tp = cm.ravel()

    # 3. False Positive Rate on Hard Negatives (Crucial firewall metric)
    hard_neg_indices = [
        i
        for i, r in enumerate(records)
        if "hard_negative" in r.get("attack_family", "")
        or r.get("source") == "synthetic_hard_negatives_v1"
    ]
    hard_neg_probs = y_probs[hard_neg_indices] if hard_neg_indices else np.array([])
    hard_neg_fps = int(np.sum(hard_neg_probs >= 0.50))
    hard_neg_total = len(hard_neg_indices)
    hard_neg_fpr = float(hard_neg_fps / hard_neg_total) if hard_neg_total > 0 else 0.0

    # 4. Generalization on Holdout Unseen Source (HackAPrompt human red-team challenges)
    unseen_indices = [
        i for i, r in enumerate(records) if r.get("source") == "hackaprompt/hackaprompt-dataset"
    ]
    unseen_y_true = y_true[unseen_indices] if unseen_indices else np.array([])
    unseen_probs = y_probs[unseen_indices] if unseen_indices else np.array([])
    unseen_preds = (unseen_probs >= 0.50).astype(int)
    unseen_recall = (
        float(recall_score(unseen_y_true, unseen_preds)) if len(unseen_indices) > 0 else 0.0
    )
    unseen_f1 = float(f1_score(unseen_y_true, unseen_preds)) if len(unseen_indices) > 0 else 0.0

    # 5. Operating Points / Policy Presets
    operating_points = {}
    for name, thresh in [("strict", 0.35), ("default", 0.50), ("lenient", 0.70)]:
        preds = (y_probs >= thresh).astype(int)
        cm_thresh = confusion_matrix(y_true, preds).ravel()
        t_tn, t_fp, t_fn, t_tp = cm_thresh
        operating_points[name] = {
            "threshold": thresh,
            "precision": round(float(precision_score(y_true, preds)), 4),
            "recall": round(float(recall_score(y_true, preds)), 4),
            "f1": round(float(f1_score(y_true, preds)), 4),
            "fpr_overall": round(float(t_fp / (t_fp + t_tn)), 4),
            "fpr_hard_negatives": round(float(np.sum(hard_neg_probs >= thresh) / hard_neg_total), 4)
            if hard_neg_total > 0
            else 0.0,
        }

    # 6. Subtype Recall Breakdown
    subtype_metrics = {}
    family_names = sorted(
        set(r.get("attack_family", "unknown") for r in records if r["label"] == 1)
    )
    for fam in family_names:
        f_idx = [i for i, r in enumerate(records) if r.get("attack_family") == fam]
        if f_idx:
            f_recall = float(recall_score(y_true[f_idx], y_pred_default[f_idx]))
            subtype_metrics[fam] = {
                "count": len(f_idx),
                "recall": round(f_recall, 4),
            }

    # 7. Error Analysis: Top False Positives & False Negatives
    false_positives = []
    false_negatives = []
    for idx, (true_val, pred_val, prob) in enumerate(
        zip(y_true, y_pred_default, y_probs, strict=True)
    ):
        r = records[idx]
        if true_val == 0 and pred_val == 1:
            false_positives.append(
                {
                    "id": r["id"],
                    "text": r["text"][:160],
                    "score": round(float(prob), 4),
                    "source": r["source"],
                    "family": r.get("attack_family"),
                }
            )
        elif true_val == 1 and pred_val == 0:
            false_negatives.append(
                {
                    "id": r["id"],
                    "text": r["text"][:160],
                    "score": round(float(prob), 4),
                    "source": r["source"],
                    "family": r.get("attack_family"),
                }
            )

    false_positives.sort(key=lambda x: x["score"], reverse=True)
    false_negatives.sort(key=lambda x: x["score"])

    # 8. Plot Confusion Matrix
    cm_plot_path = reports_path / "confusion_matrix.png"
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    classes = ["Benign", "Injection"]
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=classes,
        yticklabels=classes,
        ylabel="True Label",
        xlabel="Predicted Label",
        title="AEGIS Classifier Confusion Matrix (Test Split)",
    )
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j,
                i,
                format(cm[i, j], "d"),
                ha="center",
                va="center",
                color="white" if cm[i, j] > thresh else "black",
            )
    fig.tight_layout()
    plt.savefig(cm_plot_path, dpi=200)
    plt.close()

    # 9. Plot Precision-Recall Curve
    pr_plot_path = reports_path / "pr_curve.png"
    prec_pts, rec_pts, _ = precision_recall_curve(y_true, y_probs)
    fig, ax = plt.subplots(figsize=(6, 4.5))
    ax.plot(rec_pts, prec_pts, color="#2563EB", lw=2, label=f"PR Curve (AP = {pr_auc:.4f})")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title("Precision-Recall Curve (AEGIS v1 Classifier)")
    ax.legend(loc="lower left")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    plt.savefig(pr_plot_path, dpi=200)
    plt.close()

    # 10. Compile Final Results Dictionary
    metrics_data = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "dataset_test_samples": len(texts),
        "test_positives": int(np.sum(y_true == 1)),
        "test_negatives": int(np.sum(y_true == 0)),
        "overall_performance": {
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp),
            },
        },
        "hard_negatives_performance": {
            "total_hard_negatives": hard_neg_total,
            "false_positives": hard_neg_fps,
            "false_positive_rate": round(hard_neg_fpr, 4),
            "accuracy_on_hard_negatives": round(1.0 - hard_neg_fpr, 4),
        },
        "holdout_unseen_generalization": {
            "source": "hackaprompt/hackaprompt-dataset",
            "samples": len(unseen_indices),
            "recall": round(unseen_recall, 4),
            "f1": round(unseen_f1, 4),
        },
        "operating_points": operating_points,
        "subtype_recall": subtype_metrics,
        "latency_benchmark_single_sample_ms": round(avg_latency_ms, 3),
        "error_analysis": {
            "top_false_positives": false_positives[:25],
            "top_false_negatives": false_negatives[:25],
        },
    }

    metrics_json_path = reports_path / "metrics.json"
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    print("\n================ EVALUATION SUMMARY ================")
    print(f"Overall Precision:             {precision:.4f}")
    print(f"Overall Recall:                {recall:.4f}")
    print(f"Overall F1 Score:              {f1:.4f}")
    print(f"ROC-AUC:                       {roc_auc:.4f}")
    print(f"PR-AUC (Avg Precision):        {pr_auc:.4f}")
    print(f"Hard-Negative FPR:             {hard_neg_fpr:.4%} ({hard_neg_fps}/{hard_neg_total})")
    print(f"Holdout Unseen (HackAPrompt) F1: {unseen_f1:.4f} (Recall: {unseen_recall:.4f})")
    print(f"Average CPU Inference Latency: {avg_latency_ms:.2f} ms")
    print(f"[OK] Saved metrics to: {metrics_json_path}")
    print(f"[OK] Saved confusion matrix to: {cm_plot_path}")
    print(f"[OK] Saved PR curve to: {pr_plot_path}")
    print("====================================================")

    return metrics_data


if __name__ == "__main__":
    evaluate_classifier()
