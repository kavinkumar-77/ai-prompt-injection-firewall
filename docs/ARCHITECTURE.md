# Architecture Specification: Project AEGIS

## 1. System Overview

**Project AEGIS** is a local-first security gateway and firewall deployed between client applications (autonomous AI agents, web frontends, and OpenAI-compatible SDKs) and Large Language Models (LLMs). It intercepts, normalizes, inspects, and validates prompt payloads and agent actions across a deterministic 6-layer defense pipeline.

```
┌─────────────────────────────────┐
│       Client Applications       │
│  - aegis-client Python SDK      │
│  - OpenAI-compatible clients    │
│  - Browser Agents / Extension   │
└───────────────┬─────────────────┘
                │ HTTP REST / SSE Stream
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   AEGIS Security Gateway (FastAPI)                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Sequential Defense Pipeline                   │  │
│  │                                                                  │  │
│  │  1. Normalizer / Deobfuscator                                    │  │
│  │     (NFKC, zero-width stripping, homoglyphs, base64, CSS hidden) │  │
│  │                                                                  │  │
│  │  2. Secrets & PII Engine                                         │  │
│  │     (Entropy analysis, Luhn CC, Verhoeff Aadhaar, API key masks) │  │
│  │                                                                  │  │
│  │  3. Deterministic Security Rules                                 │  │
│  │     (Delimiter smuggling, Markdown exfil, Jailbreak framings)    │  │
│  │                                                                  │  │
│  │  4. ML Classifier Layer                                          │  │
│  │     (Calibrated Logistic Regression on ONNX Runtime CPU)         │  │
│  │                                                                  │  │
│  │  5. Context & Trust Layer                                        │  │
│  │     (Source-aware multipliers: system, user, retrieved, tool)    │  │
│  │                                                                  │  │
│  │  6. Decision Engine & Policy Enforcement                         │  │
│  │     (Active presets: strict, balanced, lenient -> allow/block)   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌────────────────────────┐  ┌──────────────────────────────────────┐  │
│  │   Canary Token Engine  │  │     Tool-Call Policy Guard           │  │
│  │   (HMAC-SHA-256 Nonce) │  │     (Taint Tracking & Capabilities)  │  │
│  └────────────────────────┘  └──────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────────────┬──────────────┘
                │ Upstream Proxy                          │ Event Log
                ▼                                         ▼
┌─────────────────────────────────┐       ┌──────────────────────────────┐
│       Upstream LLM Provider     │       │   Cryptographic Storage      │
│   (Ollama / vLLM / OpenAI)      │       │   (Salted SHA-256 SQLite/PG) │
└─────────────────────────────────┘       └──────────────────────────────┘
```

---

## 2. Core Components

### 2.1 The Inspection Pipeline (`backend/app/core/pipeline.py`)
Each incoming payload is processed through an ordered, immutable layer chain. Every layer returns a `LayerResult` containing:
- `layer`: Layer identifier (`normalizer`, `secrets`, `rules`, `classifier`, `context`, `decision`).
- `score`: Normalized risk score ($0.0 \le \text{score} \le 1.0$).
- `label`: Classification label (`clean`, `prompt_injection`, `secret_leak`, `pii_detected`).
- `evidence`: List of character `Evidence` spans (`(start, end)`) with forensic descriptions.
- `latency_ms`: Execution time in milliseconds.

### 2.2 Trust Levels (`backend/app/core/trust.py`)
Text payloads carry a trust origin:
- `system`: Highest trust. Instructions define base agent behavior.
- `user`: Standard interactive user input.
- `retrieved`: Untrusted external text (RAG search results, scraped web copy). Carries a $1.35\times$ risk multiplier for instruction-like imperatives.
- `tool_output`: Untrusted execution output (SQL query output, API responses). Carries a $1.45\times$ risk multiplier.

### 2.3 Machine Learning Engine (`backend/app/layers/classifier.py`)
A Sublinear TF-IDF feature extractor + Calibrated Logistic Regression classifier trained on 5,380 curated samples.
- **Export format:** ONNX INT8 quantized (`models/classifier.onnx`, 982 KB).
- **Execution:** Single-threaded CPU execution using ONNX Runtime.
- **Sliding Window:** Analyzes long texts using 500-character windows with a 250-character stride, taking the maximum score across chunks up to a bounded cap of 12 chunks.

---

## 3. Sequence Diagrams

### 3.1 Text Scan Flow (`POST /v1/scan`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Application / Agent
    participant GW as AEGIS Gateway
    participant P as Defense Pipeline
    participant DB as Audit DB (SQLite)

    Client->>GW: POST /v1/scan {text, source="user"}
    GW->>P: scan(ScanRequest)
    P->>P: Layer 1: Normalizer (deobfuscate)
    P->>P: Layer 2: Secrets (validate & redact)
    P->>P: Layer 3: Deterministic Rules (catalog match)
    P->>P: Layer 4: ML Classifier (ONNX CPU inference)
    P->>P: Layer 5: Context (trust multiplier)
    P->>P: Layer 6: Decision Engine (verdict evaluation)
    P-->>GW: ScanResponse {verdict, risk_score, evidence}
    GW->>DB: Log Salted SHA-256 Digest (Zero Raw Text)
    GW-->>Client: HTTP 200 {verdict="block", risk_score=0.98, explanations=[...]}
```

### 3.2 Gateway Streaming Chat Proxy (`POST /v1/chat/completions`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as OpenAI SDK Client
    participant GW as AEGIS Gateway
    participant P as Defense Pipeline
    participant LLM as Upstream LLM (Ollama)

    Client->>GW: POST /v1/chat/completions {stream=true, messages=[...]}
    GW->>P: Pre-flight scan on user/system prompts
    alt Prompt Injection Detected
        GW-->>Client: HTTP 400 {error: {type: "aegis_policy_violation", code: "prompt_injection_blocked"}}
    else Prompt Clean
        GW->>GW: Inject Canary Token (aegis-canary-...)
        GW->>LLM: Forward Request with SSE stream
        loop Token Stream Generation
            LLM-->>GW: data: {"choices": [{"delta": {"content": "..."}}]}
            GW->>GW: Buffer tokens & inspect for canary or exfil links
            alt Canary Leak Detected
                GW-->>Client: data: {"choices": [{"delta": {"content": "[BLOCKED: Canary Token Leak]"}}]}
                GW-->>Client: data: [DONE]
            else Stream Clean
                GW-->>Client: data: {"choices": [{"delta": {"content": "..."}}]}
            end
        end
    end
```

### 3.3 Agent Tool-Call Capability Guard (`POST /v1/scan/tool-call`)

```mermaid
sequenceDiagram
    autonumber
    actor Agent as Autonomous Agent
    participant GW as AEGIS Gateway
    participant TLayer as ToolCallLayer
    participant Policy as Capability YAML Policy

    Agent->>GW: POST /v1/scan/tool-call {tool_name="send_email", arguments={...}, is_context_tainted=true}
    GW->>TLayer: evaluate(tool_name, arguments, tainted=True)
    TLayer->>Policy: Check allowlist & argument constraints
    TLayer->>TLayer: Check taint rules (high-risk tool invoked from untrusted context)
    alt Taint Policy Triggered
        TLayer-->>GW: LayerResult {verdict="block", label="tainted_context_violation"}
        GW-->>Agent: HTTP 200 {allowed=false, reason="Untrusted context blocked from invoking send_email"}
    else Safe Tool Execution
        TLayer-->>GW: LayerResult {verdict="allow"}
        GW-->>Agent: HTTP 200 {allowed=true}
    end
```
