"""Machine learning classifier layer interface for prompt injection detection.

In Phase 1, this layer wraps the baseline/mock classifier.
In Phase 2, this will load and execute the trained ONNX quantized transformer model.
"""

from __future__ import annotations

import time

from app.core.models import Evidence, LayerResult
from app.layers.legacy_tfidf import legacy_tfidf_engine


class ClassifierLayer:
    """Evaluates text payloads against trained ML models."""

    def __init__(self, model_path: str | None = None) -> None:
        self.layer_name = "classifier"
        self.model_path = model_path
        # Will be instantiated with onnxruntime.InferenceSession in Phase 2

    def process(self, text: str) -> LayerResult:
        """Runs model inference on the text payload."""
        start_time = time.perf_counter()
        if not text:
            elapsed = (time.perf_counter() - start_time) * 1000
            return LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        # Baseline evaluation (Phase 1)
        res = legacy_tfidf_engine.analyze_semantic_vector(text)
        score = float(res.get("max_similarity", 0.0))
        label = str(res.get("matched_family", "benign"))
        evidence = []

        if res.get("is_adversarial", False):
            evidence.append(
                Evidence(
                    kind="semantic_vector_match",
                    span=None,
                    detail=(
                        f"Semantic vector aligned with prototype attack family '{label}' "
                        f"(similarity={score:.2f})"
                    ),
                )
            )

        elapsed = (time.perf_counter() - start_time) * 1000
        return LayerResult(
            layer=self.layer_name,
            score=score,
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
