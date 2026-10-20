# Frequently Asked Questions (FAQ): Project AEGIS

### 1. What is Project AEGIS in simple terms?
Project AEGIS is an open-source, local-first security gateway and firewall for AI applications. It sits between your users, agents, and Large Language Models, inspecting prompts and tool actions to prevent prompt injection (direct and indirect), credential and PII leakage, and dangerous agent actions.

### 2. How does AEGIS differ from Llama Guard or NeMo Guardrails?
- **Zero External Network Calls:** Unlike cloud-based guardrails or LLM-as-a-judge approaches that require calling a heavy 7B+ model for every incoming message, AEGIS executes a quantized ONNX model and deterministic rules locally on CPU in $< 1.5\text{ ms}$.
- **Hardware Footprint:** AEGIS runs in $< 200\text{ MB}$ RAM on standard commodity hardware. It does not require a dedicated GPU for serving.
- **Agent Action Governance:** Beyond text classification, AEGIS inspects autonomous tool calls (path traversal, tainted context execution, email exfiltration).

### 3. Why run detection on CPU instead of using a large model?
Calling an external LLM (e.g. GPT-4o-mini or Llama-3-8B) to inspect every prompt adds $300\text{--}1,500\text{ ms}$ of latency and $2\times$ token costs. By deploying a calibrated classifier and deterministic rule engine on CPU via ONNX Runtime, AEGIS achieves single-request latency under $1.5\text{ ms}$, adding negligible overhead to interactive applications.

### 4. What are "Trust Levels" and why are they critical for indirect injection?
Indirect prompt injection occurs when an agent ingests untrusted external content (e.g., a customer email, a scraped webpage, or a RAG document) that contains hidden instructions. AEGIS tags every text payload with its provenance:
- `system`: Trusted developer directives.
- `user`: Standard interactive user queries.
- `retrieved`: External documents ($1.35\times$ suspicion multiplier for imperative commands).
- `tool_output`: Output from API calls ($1.45\times$ suspicion multiplier; blocks high-risk tools).

Treating external data with lower trust than user prompts allows the firewall to stop attacks without blocking legitimate user instructions.

### 5. How does AEGIS guarantee zero raw user data in logs and databases?
Under no circumstances are raw user prompts, chat messages, or document snippets written to disk or relational databases. Payloads are salted and hashed using SHA-256 before storage:
$$\text{Digest} = \text{SHA-256}(\text{Salt} \parallel \text{Text})$$
Only the first 16 characters of the digest are preserved as an irreversible cryptographic fingerprint (`hash_prefix`), enabling deduplication without privacy exposure.

### 6. What is the False Positive Rate (FPR) and why does it matter?
A security filter that blocks legitimate user requests quickly frustrates users and gets disabled by engineering teams. On a holdout evaluation of 2,550 negative samples (including 600 complex coding and cybersecurity prompts), AEGIS demonstrated a **0.0000% False Positive Rate (0 / 2,550)**, ensuring that safe requests are never interrupted.

### 7. How do Canary Tokens work in post-flight inspection?
During session initialization, AEGIS generates a high-entropy secret nonce (`aegis-canary-<hex24>`) and injects it into the system prompt directives. If an attacker's prompt successfully tricks the model into dumping its system instructions, the gateway's post-flight streaming buffer detects the canary token in the output and terminates the stream before the leak reaches the client.

### 8. How do I integrate AEGIS with OpenAI SDK or LangChain?
Because AEGIS exposes a drop-in OpenAI-compatible API (`POST /v1/chat/completions`), you can simply redirect your client's `base_url`:

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="any-key")
response = client.chat.completions.create(
    model="llama3", messages=[{"role": "user", "content": "Hello!"}]
)
```

Alternatively, use our official `aegis-client` Python SDK:
```python
from aegis_client import wrap_openai

client = wrap_openai(OpenAI())
```

### 9. Can AEGIS be deployed in air-gapped or regulated enterprise environments?
Yes. AEGIS has zero outbound internet dependencies during runtime. All model weights, regex catalogs, and dependencies execute strictly within your local network or Docker container.

### 10. What is the throughput capacity on a single machine?
On standard modern dev hardware (Intel Core i7 / AMD Ryzen with 16 GB RAM), AEGIS processes **762 requests per second (RPS)** under 20 concurrent connections with a P95 latency of **4.10 ms**.
