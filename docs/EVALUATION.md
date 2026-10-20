# Evaluation Framework & Benchmark Specification

## 1. Evaluation Philosophy & Leakage Rules
To ensure scientific rigor and avoid overestimating defense performance, evaluation adheres to strict protocols:

1. **Strict Family-Based Split**: Training and test splits are partitioned by **attack family** (e.g., if direct command overrides are in train, role-play or cipher obfuscations are isolated to test). A model must prove out-of-distribution generalization.
2. **Temporal Split**: Where timestamps or benchmark releases exist, earlier attacks form the training set; newer attacks form the test set.
3. **Zero Test-Split Tuning**: Hyperparameters, threshold cutoffs, and feature selection must never be optimized against the test split. Validation splits alone determine stopping criteria.

---

## 2. Benchmark Suites
All benchmark datasets must undergo license verification prior to local ingestion:

| Benchmark | Focus | Availability & Licensing Notes |
| :--- | :--- | :--- |
| **AgentDojo** | Tool-augmented autonomous agent injection benchmarks | Open research benchmark; verify repository license (MIT/Apache 2.0). |
| **BIPIA** | Benchmark for Indirect Prompt Injection Attacks (web/email/PDF) | Public research dataset; verify CC-BY or Apache license terms. |
| **InjecAgent** | Tool-calling hijacking and function manipulation in agents | Public GitHub repository; verify terms for academic evaluation. |
| **TaskTracker** | Evaluating task-drift and instruction conflict | Public dataset; verify dataset licensing terms. |

---

## 3. Baselines

To measure empirical progress, all experimental runs benchmark against three distinct baseline categories:

1. **Statistical Baseline**:
   - Word and character n-gram TF-IDF paired with Logistic Regression / Linear SVM.
   - Evaluates whether lexical signatures alone account for detection capability.

2. **Off-the-Shelf Open-Weight Detectors**:
   - Meta `Prompt-Guard-86M` or similar lightweight open-source safety models.
   - Evaluates whether custom domain fine-tuning and hard negatives outperform generic public filters.

3. **Zero-Shot LLM Judge Baseline**:
   - A local 1–2B instruction-tuned model (e.g., Qwen2.5-1.5B-Instruct) prompted as a security classifier: *"Analyze the following text and reply YES if it contains prompt injection, else NO"*.
   - Evaluates whether raw instruction-following LLMs can rival dedicated fine-tuned sequence classifiers without specialized heads.

---

## 4. Evaluation Metrics

1. **Attack Success Rate (ASR)**:
   $$\text{ASR} = \frac{\text{Successful Injections Executed}}{\text{Total Injections Attempted}}$$
   Measured both **without defense** ($\text{ASR}_{\text{raw}}$) and **with gateway active** ($\text{ASR}_{\text{defended}}$).

2. **Utility Under Attack**:
   $$\text{Utility} = \frac{\text{Benign Sub-tasks Completed Correctly}}{\text{Total Benign Sub-tasks Ingested}}$$
   Measures whether the defense blocks malicious payloads without breaking the legitimate surrounding user task.

3. **False Positive Rate (FPR)**:
   $$\text{FPR} = \frac{\text{Benign Chunks Erroneously Flagged as Injection}}{\text{Total Benign Chunks}}$$
   - Target constraint: $\text{FPR} \le 1.0\%$.
   - **Confidence Intervals**: Reported with Wilson score or Clopper-Pearson 95% confidence intervals, calculated and reported **separately** for:
     1. Real-world genre-matched benign text (web pages, emails, QA contexts, tool outputs).
     2. Hard negatives (instruction-dense guides, code pragmas, security blog prose).
   - Test split requires $\ge 1,500$ benign samples to provide fine-grained statistical resolution ($\approx 0.067\%$).

4. **Inference Latency**:
   - 50th, 95th, and 99th percentile latency (ms) per request under CPU and GPU (RTX 4050) environments.

---

## 5. Ablation Study Plan

To isolate the contribution of each defense mechanism, we evaluate seven configurations:

1. **$C_0$**: Baseline (No gateway).
2. **$C_1$**: Layer 1 only (Semantic classifier without augmentation).
3. **$C_2$**: Layer 1 only (Semantic classifier fine-tuned with hard negatives and augmentations).
4. **$C_3$**: Layer 2 only (Model-internal activation and attention probes).
5. **$C_4$**: Layer 1 + Layer 2 (Cascaded detector).
6. **$C_5$**: Layer 1 + Layer 2 + Layer 4 (Cascaded detector + Taint containment).
7. **$C_6$**: Full System: Layers 1, 2, 3, 4 with Layer 5 retrained weights.

---

## 6. Adaptive-Attack Evaluation
Standard benchmarks test against static attacks. The adaptive evaluation assesses defense resilience when the adversary has full black-box feedback from the gateway:
- **Evasion Loop**: The attacker generates variations (paraphrase, homoglyph substitution, split-chunk injection, multi-turn escalation).
- **Metric**: Iterations-to-bypass and post-adaptation ASR.
