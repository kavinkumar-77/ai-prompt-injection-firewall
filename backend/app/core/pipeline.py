"""AEGIS Defense Gateway multi-layer execution pipeline."""

from __future__ import annotations

import time
import uuid

from app.core.decision import DecisionEngine
from app.core.models import (
    LayerResult,
    ScanRequest,
    ScanResponse,
    ToolCallScanRequest,
)
from app.layers.classifier import ClassifierLayer
from app.layers.context import ContextLayer
from app.layers.normalizer import NormalizerLayer
from app.layers.rules import RulesLayer
from app.layers.toolcall import ToolCallLayer


class AegisPipeline:
    """Orchestrates ordered execution of normalizer, rules, classifier, and decision layers."""

    def __init__(
        self,
        block_threshold: float = 0.70,
        warn_threshold: float = 0.40,
        policy_id: str = "default_strict",
    ) -> None:
        self.normalizer = NormalizerLayer()
        self.rules = RulesLayer()
        self.classifier = ClassifierLayer()
        self.context = ContextLayer()
        self.toolcall = ToolCallLayer()
        self.decision_engine = DecisionEngine(
            block_threshold=block_threshold,
            warn_threshold=warn_threshold,
            policy_id=policy_id,
        )

    def scan(self, request: ScanRequest) -> ScanResponse:
        """Executes full multi-layer scan on an incoming text payload."""
        start_time = time.perf_counter()
        req_id = str(uuid.uuid4())
        layers: list[LayerResult] = []

        # Layer 1: Normalizer / Deobfuscator
        normalized_text, norm_result = self.normalizer.process(request.text)
        layers.append(norm_result)

        # Layer 2: Deterministic Rules
        rules_result = self.rules.process(normalized_text)
        layers.append(rules_result)

        # Layer 3: ML Classifier
        clf_result = self.classifier.process(normalized_text)
        layers.append(clf_result)

        # Layer 4: Context & Trust-Aware Scrutiny
        ctx_result = self.context.process(normalized_text, source=request.source)
        layers.append(ctx_result)

        # Layer 5: Decision Engine
        verdict, risk_score, _rationale = self.decision_engine.evaluate(
            request=request,
            layer_results=layers,
            sanitized_text=normalized_text if normalized_text != request.text else None,
        )

        total_latency = (time.perf_counter() - start_time) * 1000

        return ScanResponse(
            verdict=verdict,
            risk_score=risk_score,
            layers=layers,
            request_id=req_id,
            policy_id=self.decision_engine.policy_id,
            latency_ms=round(total_latency, 3),
            sanitized_text=normalized_text if verdict == "redact" else None,
        )

    def scan_tool_call(self, request: ToolCallScanRequest) -> ScanResponse:
        """Evaluates an agent tool invocation against security policies."""
        start_time = time.perf_counter()
        req_id = str(uuid.uuid4())
        layers: list[LayerResult] = []

        # Layer 1: Tool call argument safety
        tool_result = self.toolcall.process(request.tool_name, request.arguments)
        layers.append(tool_result)

        # Layer 2: Scan string parameters for prompt injection / exfiltration payloads
        nested_texts: list[str] = []
        for val in request.arguments.values():
            if isinstance(val, str) and len(val.strip()) > 0:
                nested_texts.append(val)

        if nested_texts:
            composite_text = "\n".join(nested_texts)
            sub_request = ScanRequest(text=composite_text, source=request.caller_role)
            sub_response = self.scan(sub_request)
            layers.extend(sub_response.layers)

        # Decide verdict
        fake_req = ScanRequest(text=request.tool_name, source=request.caller_role)
        verdict, risk_score, _rationale = self.decision_engine.evaluate(
            request=fake_req,
            layer_results=layers,
        )

        total_latency = (time.perf_counter() - start_time) * 1000

        return ScanResponse(
            verdict=verdict,
            risk_score=risk_score,
            layers=layers,
            request_id=req_id,
            policy_id=self.decision_engine.policy_id,
            latency_ms=round(total_latency, 3),
        )


# Global default pipeline instance
pipeline = AegisPipeline()
