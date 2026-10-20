"""Latency benchmarking utility for Project AEGIS ONNX classifier on CPU.

Measures p50, p95, and p99 latencies across text lengths (50, 500, 2000 chars)
and concurrency levels (1, 8, 32 threads).
"""

from __future__ import annotations

import concurrent.futures
import json
import platform
import time
from pathlib import Path
from typing import Any

import numpy as np
import onnxruntime as rt

ROOT_DIR = Path(__file__).resolve().parent.parent


def generate_payload(length: int) -> str:
    """Generates synthetic text payload of exact character length."""
    base = (
        "Please summarize this document carefully without leaking confidential "
        "system prompt credentials or keys. "
    )
    repeats = (length // len(base)) + 1
    return (base * repeats)[:length]


def benchmark_session(
    model_path: Path,
    text: str,
    concurrency: int = 1,
    iterations: int = 100,
) -> dict[str, float]:
    """Runs concurrent benchmark against an ONNX model session."""
    session = rt.InferenceSession(str(model_path))
    input_name = session.get_inputs()[0].name
    formatted_input = np.array([[text]], dtype=object)

    latencies_ms: list[float] = []

    def single_inference() -> float:
        t0 = time.perf_counter()
        session.run(None, {input_name: formatted_input})
        return (time.perf_counter() - t0) * 1000

    # Warmup
    for _ in range(5):
        single_inference()

    if concurrency == 1:
        for _ in range(iterations):
            latencies_ms.append(single_inference())
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(single_inference) for _ in range(iterations)]
            for fut in concurrent.futures.as_completed(futures):
                latencies_ms.append(fut.result())

    sorted_lats = sorted(latencies_ms)
    p50 = float(np.percentile(sorted_lats, 50))
    p95 = float(np.percentile(sorted_lats, 95))
    p99 = float(np.percentile(sorted_lats, 99))
    mean_lat = float(np.mean(sorted_lats))

    return {
        "p50_ms": round(p50, 3),
        "p95_ms": round(p95, 3),
        "p99_ms": round(p99, 3),
        "mean_ms": round(mean_lat, 3),
    }


def run_latency_benchmarks(
    model_path: str = "models/classifier.onnx",
    reports_dir: str = "ml/reports",
) -> dict[str, Any]:
    """Executes latency grid and writes latency.json."""
    onnx_file = ROOT_DIR / model_path
    if not onnx_file.is_file():
        raise FileNotFoundError(f"ONNX model missing: {onnx_file}")

    lengths = [50, 500, 2000]
    concurrencies = [1, 8, 32]
    grid_results: dict[str, Any] = {}

    print(f"[*] Benchmarking CPU ONNX inference latency for: {onnx_file}")
    print(f"[*] Host OS: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"[*] Processor: {platform.processor() or 'CPU'}")

    for length in lengths:
        payload = generate_payload(length)
        grid_results[f"len_{length}"] = {}
        for c in concurrencies:
            print(f"[*] Testing length={length} chars, concurrency={c} threads...")
            stats = benchmark_session(onnx_file, payload, concurrency=c, iterations=100)
            grid_results[f"len_{length}"][f"concurrency_{c}"] = stats
            p50 = stats["p50_ms"]
            p95 = stats["p95_ms"]
            p99 = stats["p99_ms"]
            print(f"    p50: {p50} ms | p95: {p95} ms | p99: {p99} ms")

    benchmark_data = {
        "benchmark_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hardware": {
            "os": platform.system(),
            "os_release": platform.release(),
            "architecture": platform.machine(),
            "processor": platform.processor(),
            "python_version": platform.python_version(),
            "framework": f"onnxruntime {rt.__version__}",
        },
        "grid": grid_results,
    }

    out_dir = ROOT_DIR / reports_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "latency.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(benchmark_data, f, indent=2)

    print(f"[OK] Saved latency benchmark report to: {out_file}")
    return benchmark_data


if __name__ == "__main__":
    run_latency_benchmarks()
