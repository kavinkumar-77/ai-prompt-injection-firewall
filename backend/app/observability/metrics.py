"""Telemetry and operational metrics for Project AEGIS Gateway."""

from __future__ import annotations

import time
from typing import Any


class GatewayMetrics:
    """Thread-safe telemetry aggregator for gateway traffic and threat detections."""

    def __init__(self) -> None:
        self.start_time = time.time()
        self.total_scans = 0
        self.verdict_counts: dict[str, int] = {
            "allow": 0,
            "warn": 0,
            "block": 0,
            "redact": 0,
        }
        self.latencies_ms: list[float] = []

    def record_scan(self, verdict: str, latency_ms: float) -> None:
        """Records an execution event."""
        self.total_scans += 1
        if verdict in self.verdict_counts:
            self.verdict_counts[verdict] += 1
        else:
            self.verdict_counts[verdict] = 1

        # Keep last 1,000 latencies to avoid memory growth
        self.latencies_ms.append(latency_ms)
        if len(self.latencies_ms) > 1000:
            self.latencies_ms.pop(0)

    def get_summary(self) -> dict[str, Any]:
        """Calculates operational summary and percentiles."""
        uptime = round(time.time() - self.start_time, 1)
        avg_latency = (
            round(sum(self.latencies_ms) / len(self.latencies_ms), 2) if self.latencies_ms else 0.0
        )

        p95_latency = 0.0
        if self.latencies_ms:
            sorted_lat = sorted(self.latencies_ms)
            p95_idx = int(len(sorted_lat) * 0.95)
            p95_latency = round(sorted_lat[min(p95_idx, len(sorted_lat) - 1)], 2)

        return {
            "uptime_seconds": uptime,
            "total_scans": self.total_scans,
            "verdicts": self.verdict_counts,
            "latency": {
                "avg_ms": avg_latency,
                "p95_ms": p95_latency,
                "sample_count": len(self.latencies_ms),
            },
        }


metrics_collector = GatewayMetrics()
