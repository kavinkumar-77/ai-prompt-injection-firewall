# ADR-002: Layered Pipeline with Per-Layer Evidence Spans

## Status
Accepted

## Context
Single black-box classifiers that return only an aggregate scalar score (e.g. `0.87`) provide poor explainability, high debugging friction, and no character-level feedback for human operators or user interfaces. Security engineers require granular forensic trails explaining *why* an action was blocked.

## Decision
AEGIS implements an ordered multi-layer inspection pipeline where every layer independently returns a `LayerResult` with:
- `score`: Normalized risk score $[0.0, 1.0]$
- `label`: Discrete diagnostic classification
- `evidence`: List of `Evidence(kind, span: (start, end) | None, detail)`
- `latency_ms`: Measured execution time

Character spans allow the dashboard and client applications to visually highlight flagged tokens, delimiters, or encoded fragments directly within the text.

## Consequences
- **Positive:** Complete explainability and auditability; layers can be independently benchmarked, disabled, or tuned; granular evidence highlighting in UI.
- **Negative:** Slight serialization overhead relative to a single boolean return value.
