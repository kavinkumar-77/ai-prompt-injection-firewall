# ADR 0001: Local Gateway vs. Model-Integrated Defense

## Context
Prompt injection poses a severe threat to applications powered by LLMs. Mitigations can theoretically be implemented at different points in the system architecture:
1. Re-training or fine-tuning the downstream foundation LLM.
2. Embedding defenses inside client-side browser extensions.
3. Placing a local defense proxy/gateway between the client/agent and the LLM.

## Decision
We implement defense as a **local standalone gateway (proxy)** positioned between callers (users, autonomous agents) and downstream LLMs.

## Alternatives Considered
- **Base Model Retraining**: Impractical on a laptop budget; cannot protect third-party proprietary APIs or diverse open models.
- **Client-Side Browser Extension Only**: Ineffective against server-side RAG pipelines, API-based agents, and tool execution backends.
- **Hosted Cloud Security API**: Violates our constraint for zero cost, creates dependency on external networks, and exposes private data to third-party providers.

## Consequences
### Positive
- **Model Agnostic**: Compatible with any local (Ollama, vLLM) or remote LLM endpoint.
- **Full Context Visibility**: Can inspect raw inputs, multi-chunk RAG data, tool descriptions, and action proposals.
- **Complete Local Privacy**: All inspection, probing, and policy enforcement happen on the local machine with zero external network leakage.

### Negative
- Adds a small hop latency (target $< 15\text{ms}$ on fast path).
- Requires local resource management to share GPU memory with any locally hosted LLM.
