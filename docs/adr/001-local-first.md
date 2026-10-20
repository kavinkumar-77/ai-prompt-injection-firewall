# ADR-001: Local-First Architecture (Zero Third-Party Cloud Calls for Detection)

## Status
Accepted

## Context
Many modern security solutions offload inspection or content moderation to third-party cloud APIs (e.g. OpenAI Moderation API, AWS Bedrock Guardrails, Lakera Cloud). For an enterprise security gateway protecting confidential prompts, internal codebase snippets, and proprietary data, sending unencrypted inputs to third-party APIs introduces serious data leakage, latency overhead, and regulatory compliance violations.

## Decision
All inspection layers in Project AEGIS (normalization, deterministic rules, semantic classification, context evaluation, and tool-call gating) must execute strictly on local machine hardware (CPU or consumer GPU) with zero outbound network calls during detection.

## Consequences
- **Positive:** Zero data leakage risk to external third parties; deterministic sub-millisecond to sub-15ms latency; fully hermetic offline execution and testability.
- **Negative:** Constrained by local compute and memory budgets (must run on consumer laptops with 16 GB RAM and 6 GB VRAM).
