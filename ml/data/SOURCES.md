# Dataset Sources & Provenance Register

This document tracks all candidate and approved datasets for the **AI Defense Gateway against Prompt Injection**, including verified repository URLs, exact license declarations, sample counts, and inclusion decisions.

---

## 1. Candidate Source Audit Table

| Source Name | Platform / Repo URL | Exact License Declaration | Size (Raw) | Role & Status | Decision Rationale |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`deepset/prompt-injections`** | `https://huggingface.co/datasets/deepset/prompt-injections` | `license: apache-2.0` | 660 rows | **OK (Train/Val/Test)** | Verified permissive Apache 2.0 license. Contains mixed prompt injections and benign prompts. |
| **`jackhhao/jailbreak-classification`** | `https://huggingface.co/datasets/jackhhao/jailbreak-classification` | `license: apache-2.0` | 1,308 rows | **OK (Train/Val, Capped: 1,000)** | Verified permissive Apache 2.0 license. Mapped to `kind: direct`. |
| **`microsoft/BIPIA`** | `https://github.com/microsoft/BIPIA` | `MIT License (Copyright (c) Microsoft Corporation)` via [LICENSE](https://github.com/microsoft/BIPIA/blob/main/LICENSE) | 4,500+ rows | **OK (Train Split -> Train only; Test Split -> Eval only)** | Verified MIT license. Upstream contexts are permissively licensed (see Section 2). Strict split isolation prevents benchmark contamination. |
| **`hackaprompt/hackaprompt-dataset`** | `https://huggingface.co/datasets/hackaprompt/hackaprompt-dataset` | `license: mit` | 600,000+ rows | **OK (Held-Out Test Source, Capped: 1,500)** | Verified MIT license. Held out completely from train/val as an unseen human red-team test source. |
| **`uiuc-kang-lab/InjecAgent`** | `https://github.com/uiuc-kang-lab/InjecAgent` | `MIT License (Copyright (c) 2024 UIUC Kang Lab)` via [LICENSE](https://github.com/uiuc-kang-lab/InjecAgent/blob/main/LICENSE) | 1,054 cases | **HELD OUT (Zero in v1)** | Preserved strictly as unseen evaluation benchmark for Issue #12. ZERO training rows. |
| **`microsoft/TaskTracker`** | `https://github.com/microsoft/TaskTracker` | `MIT License (Copyright (c) Microsoft Corporation)` via [LICENSE](https://github.com/microsoft/TaskTracker/blob/main/LICENSE) | 500,000+ samples | **DEFERRED (Zero in v1)** | Re-verified repository URL. Reserved exclusively for Milestone 3 (activation probing & task-drift). |
| **`xTRam1/safe-guard-prompt-injection`** | `https://huggingface.co/datasets/xTRam1/safe-guard-prompt-injection` | `license: unspecified / none` | 5,000 rows | **EXCLUDED** | Dataset card contains no license terms. Secondary model cards note "terms could not be cleared". Excluded per safety policy. |
| **`HumanCompatibleAI/tensor-trust-data`** | `https://github.com/HumanCompatibleAI/tensor-trust-data` | `license: not specified (no LICENSE file in repository)` | 100,000+ attempts | **EXCLUDED** | Repository lacks a formal open-source license file. Excluded per safety policy. |

---

## 2. Upstream Context Provenance (BIPIA & Benign Corpora)

The `microsoft/BIPIA` benchmark constructs indirect prompt injection test cases by embedding adversarial instructions into real-world background contexts:

1. **Email Contexts**: Sourced from the **Enron Email Dataset** (Federal Energy Regulatory Commission public release; Public Domain for research).
2. **QA & Web Contexts**: Sourced from **SQuAD 2.0** (Stanford Question Answering Dataset, released under **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**).
3. **External Real Benign Corpora**:
   - **Wikitext-2**: Clean extracts from Wikipedia articles, licensed under **Creative Commons Attribution-ShareAlike 3.0 / 4.0 (CC BY-SA)**.
   - **Python Documentation**: Standard library documentation, licensed under **Zero-Clause BSD / PSF License Agreement**.
   - Clean background contexts from BIPIA provide paired benign examples (`group_id` matching the injected variant).

---

## 3. Label Definition & Mapping Rules

- **Positive (`label: 1`)**: Text that attempts to instruct, redirect, jailbreak, or override the intended task or boundary of an AI model.
- **Negative (`label: 0`)**: Legitimate user queries, neutral background context, documentation, and hard negatives.
- **`kind` Values**:
  - `"direct"`: Attacks initiated directly by the user (jailbreaks, DAN framing, roleplay bypass). Sourced from `jackhhao/jailbreak-classification`.
  - `"indirect"`: Attacks embedded inside external data, web pages, emails, or tool responses. Sourced from `BIPIA` and synthetic embedded injection generators.
  - `"unknown"`: Ambiguous origin.

---

## 4. Attack Families and Origins

Real metadata is preserved and mapped without inventing labels:
- `bipia_email`: Indirect injections embedded in email contexts (BIPIA dataset).
- `bipia_web`: Indirect injections embedded in web scrape contexts (BIPIA dataset).
- `bipia_qa`: Indirect injections embedded in question answering contexts (BIPIA dataset).
- `deepset_injection`: Injections from the deepset benchmark.
- `jackhhao_jailbreak`: Direct jailbreak prompts from jackhhao.
- `hackaprompt_level_1` to `hackaprompt_level_7`: Human challenge submissions stratified by difficulty level (HackAPrompt dataset; held out in test).
- `synthetic_embedded_injection`: Controlled synthetic injections embedded in real benign texts with disjoint train/test payload sets.
- `hard_negative_<category>`: Template-based hard negatives (tech docs, code, recipes, requests, security blog, legal).
- `benign_genre_matched`: Legitimate clean contexts from BIPIA, Wikitext, and Python docs.


## OpenAssistant/oasst1
- **License**: Apache-2.0
- **Usage**: Used for benign direct requests (label=0, kind=direct). Verified permissive license suitable for training.