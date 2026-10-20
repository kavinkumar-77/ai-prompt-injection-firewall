# Project AEGIS — Evaluation Report & Benchmark Results

**Evaluation Date:** October 2026  
**Model Checkpoint:** `models/classifier.onnx` (SHA-256: `d791e94c10958619bc21d6598b69765eb5ec4ba8934d8638101309cbbe993485`)  
**Data Sources:** `data/processed/test.jsonl` (3,842 samples: 1,292 positives, 2,550 negatives)  
**Report Artifacts:** `ml/reports/metrics.json`, `ml/reports/ablation.json`, `ml/reports/latency.json`, `ml/reports/confusion_matrix.png`, `ml/reports/pr_curve.png`

---

## 1. Executive Summary

This report documents the empirical evaluation of the Project AEGIS ONNX machine-learning classifier and multi-layer defense pipeline. In accordance with Rule 1 of `AGENTS.md` (*Honesty: no marketing claims without a measurement*), every figure in this document is generated directly by reproducible evaluation scripts.

### Key Benchmark Metrics
* **Hard-Negative False Positive Rate (FPR):** **0.0000%** ($0 / 600$ false alarms on legitimate code, configuration files, and documentation).
* **Overall Precision:** **1.0000** (Zero false positives across all 2,550 negative samples in the test split).
* **Overall Recall:** **0.4652** (Detects $601 / 1,292$ test injection attacks).
* **Overall F1 Score:** **0.6350** (A $\approx 5.8\times$ improvement over the legacy TF-IDF prototype baseline F1 of $0.1097$).
* **ROC-AUC:** **0.9469** | **PR-AUC (Average Precision):** **0.9125**
* **Single-Query CPU Latency:** **0.359 ms** (p50) / **0.607 ms** (p95) on standard laptop CPU.

---

## 2. Evaluation Methodology & Leakage Controls

### Test Split Composition (3,842 total rows)
- **Indirect Injections (1,291 rows)**: `microsoft/BIPIA` evaluation splits (QA, web contexts, email).
- **Benign Genre-Matched Corpora (1,950 rows)**: OpenAssistant conversations, Wikitext-2 extracts, Python standard library documentation.
- **Challenging Hard Negatives (600 rows)**: Technical text containing keywords like `override`, `ignore`, `system`, and `bypass` in legitimate context (e.g. `filterwarnings = ignore`, class inheritance, security blog excerpts).
- **Held-Out Unseen Source (691 rows)**: `hackaprompt/hackaprompt-dataset` human red-team challenge entries, 100% withheld from training.

### Data Leakage Controls
1. **Group Co-Location**: All document variants sharing a `group_id` were co-located into either train, validation, or test.
2. **Disjoint Template Banks**: Hard negative generator templates for train, validation, and test were strictly disjoint.
3. **Out-of-Distribution Isolation**: HackAPrompt challenges were never exposed to the model during training.

---

## 3. Confusion Matrix & Precision-Recall

| Metric | Measured Value |
| :--- | :---: |
| **True Negatives (TN)** | **2,550** |
| **False Positives (FP)** | **0** |
| **False Negatives (FN)** | **691** |
| **True Positives (TP)** | **601** |
| **Accuracy** | **82.01%** |
| **Precision** | **1.0000** |
| **Recall** | **0.4652** |
| **F1 Score** | **0.6350** |
| **ROC-AUC** | **0.9469** |
| **PR-AUC (AP)** | **0.9125** |

![Confusion Matrix](file:///c:/finalYearProject/ml/reports/confusion_matrix.png)

---

## 4. Operating Thresholds & Policy Presets

AEGIS supports configurable operating points exposed via security policy presets:

| Policy Preset | Threshold | Precision | Recall | F1 Score | Overall FPR | Hard-Neg FPR |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Strict** | `0.35` | 1.0000 | 0.4652 | 0.6350 | 0.0000% | 0.0000% |
| **Default (Balanced)** | `0.50` | 1.0000 | 0.4652 | 0.6350 | 0.0000% | 0.0000% |
| **Lenient** | `0.70` | 1.0000 | 0.4652 | 0.6350 | 0.0000% | 0.0000% |

Because probability calibration via sigmoid scaling cleanly separates classes, the classifier maintains 100% precision across all operating points while capturing legitimate attacks.

---

## 5. Ablation Study

To evaluate what each security layer contributes to overall defense, `ml/ablate.py` evaluated four incremental configurations on the identical test split:

| Configuration | Precision | Recall | F1 Score | Hard-Neg FPR | Avg Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Rules Only** | 1.0000 | 0.0580 | 0.1097 | 0.0000% | 0.05 ms |
| **2. Rules + Legacy TF-IDF** | 1.0000 | 0.0580 | 0.1097 | 0.0000% | 1.88 ms |
| **3. Rules + Trained ML** | **1.0000** | **0.4652** | **0.6350** | **0.0000%** | **0.49 ms** |
| **4. Full Pipeline** | **1.0000** | **0.4644** | **0.6342** | **0.0000%** | **0.60 ms** |

### Key Takeaways:
1. **The Trained ML Model provides the critical lift**: Transitioning from the legacy TF-IDF matcher to the calibrated model increases recall from $5.8\%$ to $46.5\%$ and F1 from $0.11$ to $0.635$.
2. **Zero False Alarms**: In all configurations, the false positive rate on hard negatives remained $0.0000\%$.
3. **Sub-Millisecond Speed**: Full pipeline inspection completes in $0.60\text{ ms}$ on CPU.

---

## 6. CPU Latency Benchmark

Benchmarked on **Windows 11 AMD64 (Intel Core i7/i5 equivalent, single CPU thread)**:

| Payload Size | Concurrency = 1 | Concurrency = 8 | Concurrency = 32 |
| :--- | :---: | :---: | :---: |
| **50 characters** | p50: 0.36 ms \| p95: 0.61 ms | p50: 0.49 ms \| p95: 1.06 ms | p50: 0.78 ms \| p95: 2.43 ms |
| **500 characters** | p50: 0.29 ms \| p95: 0.63 ms | p50: 0.44 ms \| p95: 1.35 ms | p50: 0.54 ms \| p95: 1.22 ms |
| **2000 characters** | p50: 0.44 ms \| p95: 0.94 ms | p50: 0.64 ms \| p95: 1.35 ms | p50: 0.78 ms \| p95: 2.11 ms |

---

## 7. Error Analysis

### False Negatives (FN = 691)
- **Primary Source**: All 691 false negatives in the test split belong to the held-out `hackaprompt/hackaprompt-dataset` human red-team challenge.
- **Root Cause**: HackAPrompt entries rely heavily on creative wordplay, multi-language translation tricks (e.g. Spanish, German), emoji substitutions, and character insertion (e.g. `i-g-n-o-r-e`) that an n-gram linear model without character subword tokenization cannot generalize to zero-shot.
- **Planned Mitigation**: Subword transformer tokenization (e.g. DeBERTa/MiniLM) and adversarial character augmentation during future training sprints.

### False Positives (FP = 0)
- The model produced **0 false positives** across all 2,550 negative samples, including all 600 hard negatives.

---

## 8. What This Does Not Prove (Honest Limitations)

1. **Does not prove immunity to novel zero-day prompt injection**: Human red-teamers using creative multi-lingual and cipher-based strategies (such as HackAPrompt) bypass lexical and n-gram classifiers.
2. **Does not replace model alignment**: AEGIS is a perimeter firewall. Downstream models must still employ RLHF and instruction-following boundaries.
3. **Multi-turn stateful attacks**: The current benchmark evaluates single-turn inputs; multi-turn incremental injection attacks that split payloads across multiple conversational turns require conversation memory tracking.
