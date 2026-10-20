"""Machine learning classifier layer executing local ONNX Runtime inference."""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

import numpy as np

from app.core.models import Evidence, LayerResult
from app.layers.legacy_tfidf import legacy_tfidf_engine

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent


class ClassifierLayer:
    """Evaluates text payloads against the trained ONNX model with sliding window aggregation."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        self.layer_name = "classifier"
        default_path = ROOT_DIR / "models" / "classifier.onnx"
        self.model_path = Path(model_path) if model_path else default_path
        self._session: Any = None
        self._input_name: str | None = None
        self._output_name: str | None = None
        self.degraded = False

    def _ensure_loaded(self) -> bool:
        """Lazy-loads ONNX session and performs warm-up inference."""
        if self._session is not None:
            return True
        if not self.model_path.is_file():
            self.degraded = True
            return False

        try:
            import onnxruntime as rt

            # Configure single-thread CPU execution for low-latency predictable execution
            opts = rt.SessionOptions()
            opts.intra_op_num_threads = 1
            opts.inter_op_num_threads = 1
            self._session = rt.InferenceSession(str(self.model_path), sess_options=opts)
            self._input_name = self._session.get_inputs()[0].name
            self._output_name = self._session.get_outputs()[1].name

            # Warm-up inference
            dummy = np.array([["warmup"]], dtype=object)
            self._session.run(None, {self._input_name: dummy})
            self.degraded = False
            return True
        except Exception:
            self.degraded = True
            return False

    def _score_text(self, text: str) -> float:
        """Runs ONNX inference on a single text string."""
        if not self._ensure_loaded() or self._session is None:
            # Graceful fallback to legacy TF-IDF prototype baseline
            res = legacy_tfidf_engine.analyze_semantic_vector(text)
            return float(res.get("max_similarity", 0.0))

        inputs = np.array([[text]], dtype=object)
        res = self._session.run(None, {self._input_name: inputs})
        # res[1] is [{0: p_benign, 1: p_injection}]
        probs = res[1]
        if probs and len(probs) > 0 and 1 in probs[0]:
            return float(probs[0][1])
        return 0.0

    def process(self, text: str) -> LayerResult:
        """Evaluates payload with sliding window chunking and max-pool aggregation."""
        start_time = time.perf_counter()
        if not text or len(text.strip()) == 0:
            elapsed = (time.perf_counter() - start_time) * 1000
            return LayerResult(
                layer=self.layer_name,
                score=0.0,
                label="clean",
                evidence=[],
                latency_ms=round(elapsed, 3),
            )

        # Sliding window for long inputs (window: 500 chars, stride: 250 chars)
        # Cap input length and max evaluation chunks to protect against CPU denial of service
        max_length = 50_000
        safe_text = text[:max_length]
        window_size = 500
        stride = 250
        max_score = 0.0
        peak_span: tuple[int, int] | None = None
        evidence: list[Evidence] = []
        max_chunks = 12
        chunk_count = 0

        if len(safe_text) <= window_size:
            score = self._score_text(safe_text)
            max_score = score
            peak_span = (0, len(safe_text))
        else:
            for start in range(0, len(safe_text), stride):
                if chunk_count >= max_chunks:
                    break
                chunk_count += 1
                end = min(len(safe_text), start + window_size)
                window_text = safe_text[start:end]
                score = self._score_text(window_text)
                if score > max_score:
                    max_score = score
                    peak_span = (start, end)
                if end == len(safe_text):
                    break

        max_score = round(max_score, 4)

        if max_score >= 0.50:
            label = "prompt_injection"
            span_desc = f"span [{peak_span[0]}:{peak_span[1]}]" if peak_span else "full text"
            evidence.append(
                Evidence(
                    kind="ml_injection_score",
                    span=peak_span,
                    detail=(
                        f"Trained ONNX classifier detected prompt injection "
                        f"probability {max_score:.2f} ({span_desc})"
                    ),
                )
            )
        elif max_score >= 0.35:
            label = "suspicious_directive"
        else:
            label = "clean"

        if self.degraded:
            evidence.append(
                Evidence(
                    kind="classifier_degraded",
                    span=None,
                    detail="ONNX model file missing; operating in degraded fallback mode.",
                )
            )

        elapsed = (time.perf_counter() - start_time) * 1000

        return LayerResult(
            layer=self.layer_name,
            score=max_score,
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
