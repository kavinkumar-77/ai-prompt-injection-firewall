"""Training script for Project AEGIS prompt injection classifiers."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import joblib
import yaml
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline

ROOT_DIR = Path(__file__).resolve().parent.parent


def load_split(jsonl_path: Path) -> tuple[list[str], list[int], list[dict[str, Any]]]:
    """Loads text, label, and full metadata from a JSONL split."""
    texts = []
    labels = []
    records = []
    with open(jsonl_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            texts.append(rec["text"])
            labels.append(int(rec["label"]))
            records.append(rec)
    return texts, labels, records


def train_classifier(config_path: str = "ml/configs/train_linear.yaml") -> dict[str, Any]:
    """Trains, calibrates, and saves a prompt injection classifier."""
    start_time = time.time()
    with open(ROOT_DIR / config_path, encoding="utf-8") as f:
        config = yaml.safe_load(f)

    train_path = ROOT_DIR / config["data"]["train_path"]
    val_path = ROOT_DIR / config["data"]["val_path"]

    print(f"[*] Loading training data from: {train_path}")
    train_texts, train_labels, _ = load_split(train_path)
    print(f"[*] Loading validation data from: {val_path}")
    val_texts, val_labels, _ = load_split(val_path)

    pos_train = sum(train_labels)
    neg_train = len(train_labels) - pos_train
    print(f"[*] Train set size: {len(train_texts)} ({pos_train} pos, {neg_train} neg)")
    pos_val = sum(val_labels)
    neg_val = len(val_labels) - pos_val
    print(f"[*] Val set size:   {len(val_texts)} ({pos_val} pos, {neg_val} neg)")

    # 1. Feature Extraction (TF-IDF Vectorizer with Sublinear Term Frequency Scaling)
    vec_cfg = config["model"]["vectorizer"]
    vectorizer = TfidfVectorizer(
        ngram_range=tuple(vec_cfg["ngram_range"]),
        analyzer=vec_cfg["analyzer"],
        lowercase=vec_cfg["lowercase"],
        max_features=vec_cfg["max_features"],
        sublinear_tf=vec_cfg["sublinear_tf"],
    )

    print("[*] Vectorizing training corpus...")
    x_train = vectorizer.fit_transform(train_texts)

    # 2. Base Linear Estimator
    clf_cfg = config["model"]["classifier"]
    base_clf = LogisticRegression(
        C=clf_cfg["C"],
        max_iter=clf_cfg["max_iter"],
        class_weight=clf_cfg["class_weight"],
        solver=clf_cfg["solver"],
        random_state=config["data"]["seed"],
    )

    # 2. Probability Calibration with 5-Fold Cross-Validation on Train Set
    cal_cfg = config["model"]["calibration"]
    cv_folds = cal_cfg.get("cv", 5)
    print(f"[*] Training calibrated classifier via {cal_cfg['method']} with {cv_folds}-fold CV...")
    calibrated_clf = CalibratedClassifierCV(
        estimator=base_clf,
        method=cal_cfg["method"],
        cv=cv_folds,
    )
    calibrated_clf.fit(x_train, train_labels)

    # 3. Construct End-to-End Inference Pipeline
    pipeline = Pipeline(
        [
            ("tfidf", vectorizer),
            ("clf", calibrated_clf),
        ]
    )

    # 5. Evaluate on Validation Split
    val_preds = pipeline.predict(val_texts)
    val_probs = pipeline.predict_proba(val_texts)[:, 1]

    val_f1 = float(f1_score(val_labels, val_preds))
    val_prec = float(precision_score(val_labels, val_preds))
    val_rec = float(recall_score(val_labels, val_preds))
    val_auc = float(roc_auc_score(val_labels, val_probs))

    print("\n--- Validation Performance ---")
    print(f"Precision: {val_prec:.4f}")
    print(f"Recall:    {val_rec:.4f}")
    print(f"F1 Score:  {val_f1:.4f}")
    print(f"ROC-AUC:   {val_auc:.4f}")
    print(
        "\nDetailed Report:\n",
        classification_report(val_labels, val_preds, target_names=["Benign", "Injection"]),
    )

    # 6. Save Artifacts
    output_joblib = ROOT_DIR / config["export"]["joblib_path"]
    output_joblib.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, output_joblib)
    print(f"[OK] Saved trained model pipeline to: {output_joblib}")

    # 7. Write run log
    runs_dir = ROOT_DIR / "ml" / "runs"
    runs_dir.mkdir(parents=True, exist_ok=True)
    run_log = runs_dir / "train.log"
    ts = time.strftime("%Y-%m-%d %H:%M:%S")
    model_name = config["model"]["name"]
    with open(run_log, "a", encoding="utf-8") as f:
        f.write(f"\n[{ts}] Model: {model_name} | Val F1: {val_f1:.4f} | AUC: {val_auc:.4f}\n")

    return {
        "val_f1": val_f1,
        "val_precision": val_prec,
        "val_recall": val_rec,
        "val_auc": val_auc,
        "elapsed_sec": round(time.time() - start_time, 2),
    }


if __name__ == "__main__":
    train_classifier()
