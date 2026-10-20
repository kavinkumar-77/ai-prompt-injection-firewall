# ADR-004: OpenAI-Compatible Gateway as Primary Integration Surface

## Status
Accepted

## Context
Adopting proprietary SDKs or unique client-side integration hooks increases friction for developers. Most AI tools, LangChain/LlamaIndex pipelines, agent runtimes, and libraries natively support pointing `base_url` to an alternative OpenAI-compatible endpoint.

## Decision
The core integration surface for Project AEGIS will be an OpenAI-compatible `/v1/chat/completions` proxy (to be deployed in Phase 4). Applications can integrate AEGIS simply by setting:
`OPENAI_BASE_URL=http://localhost:8000/v1`

Incoming requests are scanned by the pipeline before being forwarded to the upstream LLM (e.g. Ollama, vLLM, or OpenAI).

## Consequences
- **Positive:** Zero code changes required in client applications; drop-in compatibility across the entire LLM ecosystem.
- **Negative:** Gateway must implement streaming SSE proxying and schema translation.
