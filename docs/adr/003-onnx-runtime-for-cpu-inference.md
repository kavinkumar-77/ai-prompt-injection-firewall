# ADR-003: ONNX Runtime for CPU Inference of Trained Classifiers

## Status
Accepted

## Context
Deploying PyTorch or HuggingFace transformers in production gateways introduces heavy runtime dependencies (CUDA, torch libraries exceeding 2 GB), substantial startup latency, and unpredictable memory allocations that compete with the host LLM for GPU VRAM.

## Decision
The primary neural classifier (to be fine-tuned in Phase 2) will be exported to ONNX format and quantized to INT8 precision. At runtime, AEGIS uses `onnxruntime` executing on CPU.

## Consequences
- **Positive:** Zero VRAM consumption during gateway inference; fast startup ($< 100\text{ ms}$); sub-15ms CPU execution; tiny distribution footprint ($< 70\text{ MB}$).
- **Negative:** Requires an export and INT8 calibration step after training.
