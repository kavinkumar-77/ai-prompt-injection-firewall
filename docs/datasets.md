# Project AEGIS — Dataset Registry & Provenance

This registry documents all public datasets, license permissions, splits, and provenance verification for **Dataset v1** used to train and benchmark Project AEGIS classifiers.

---

## 1. Candidate Public Datasets & Licenses

| Dataset Name | Upstream Repository | License | Used in Training | Split Isolation & Role |
| :--- | :--- | :--- | :---: | :--- |
| **deepset/prompt-injections** | HuggingFace (`deepset/prompt-injections`) | Apache-2.0 | **Yes** | 662 direct prompt injections; split across train and val. |
| **jackhhao/jailbreak-classification** | HuggingFace (`jackhhao/jailbreak-classification`) | Apache-2.0 | **Yes** | 6,614 direct jailbreak prompts (balanced set); split across train and val. |
| **OpenAssistant/oasst1** | HuggingFace (`OpenAssistant/oasst1`) | Apache-2.0 | **Yes** | Permissive, clean, high-quality human chat queries used as benign background data. |
| **microsoft/BIPIA** | GitHub (`microsoft/BIPIA`) | MIT | **Yes** | Indirect prompt injections embedded into synthetic business contexts (email, QA, web). Upstream train rows only enter train; upstream test rows only enter test. |
| **hackaprompt/hackaprompt-dataset** | HuggingFace (`hackaprompt/hackaprompt-dataset`) | MIT | **No (Held out)** | 691 human red-team challenge injections held out 100% in test split to evaluate unseen OOD generalization. |
| **uiuc-kang-lab/InjecAgent** | HuggingFace (`uiuc-kang-lab/InjecAgent`) | MIT | **No (Held out)** | 1,054 agent tool-use attack scenarios held out 100% for Phase 5 Attack Lab evaluation. |

---

## 2. Hard Negatives & Synthetic Augmentation

* **Hard Negatives (`synthetic_hard_negatives_v1`)**:
  - 600 test samples and 1,800 train samples representing benign technical texts with adversarial-like words:
    - Technical documentation (e.g. `filterwarnings = ignore`, overriding default configs)
    - Code comments & programming guidelines
    - Security analysis and educational explanations
    - Legal disclaimer and privacy terms
  - Train, validation, and test splits utilize **strictly disjoint template sets**.
* **Synthetic Embedded Injections (`synthetic_embedded_injection_v1`)**:
  - Indirect injections embedded into benign contexts at prefix, infix, and suffix positions.
  - Payloads and carriers in train and test splits are strictly disjoint.

---

## 3. Contamination Controls

1. **Paired Group Co-Location (`group_id`)**: Variants of the same document or injection are assigned the same group ID and never split across train and test.
2. **Near-Duplicate Decontamination**: MinHash and Jaccard similarity deduplication ($threshold = 0.88$) filters near-duplicate pairs before splitting.
3. **Manifest Verification**: Raw source archive SHA-256 hashes are recorded in `data/raw/MANIFEST.json` and verified by `scripts/fetch_assets.py`.
