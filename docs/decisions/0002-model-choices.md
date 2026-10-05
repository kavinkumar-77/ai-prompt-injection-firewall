# ADR 0002: Model Selection and Precision Allocation Under 6 GB VRAM

## Context
The project must run locally on a developer laptop equipped with 16 GB system RAM and an NVIDIA RTX 4050 GPU with 6 GB VRAM. We require models for three distinct purposes:
1. Fast semantic injection classification ($\le$ 150M parameters).
2. Deep model-internal probing of hidden states and attention shifts (1–2B parameters).
3. Automated red-team adversarial example generation (1–2B parameters).

## Decision
1. **Semantic Classification ($\le$ 150M params)**:
   - Select **DeBERTa-v3-small** (44M backbone + head) or **ModernBERT-base** (149M params).
   - Fine-tuned with hard negatives and augmentations; served in FP16 / INT8 with sub-15ms CPU/GPU inference.

2. **Internal Activation & Attention Probing (1–2B params)**:
   - Select **Qwen2.5-1.5B** or **SmolLM2-1.7B**.
   - **Precision Policy**: The probing model runs strictly in **FP16** ($\approx$ 3.5 GB VRAM). Quantizing this model to INT4 is prohibited because low-bit quantization alters weight matrices and severely distorts internal activation values, residual streams, and attention maps.

3. **Adversarial Attacker Generator (1–2B params)**:
   - The offline red-teaming generator uses a 4-bit quantized (**INT4**) model ($\approx$ 1.5 GB VRAM).
   - Because generation requires only text sampling and does not probe activations, INT4 is sufficient.

4. **VRAM Concurrency Rule**:
   - The FP16 probing model and the INT4 attacker-generation model are **never loaded into VRAM at the same time**.
   - The attacker model runs strictly offline during data-generation runs; it is unloaded before the gateway or probing services start.

## Alternatives Considered
- **7B Models (Llama-3-8B / Qwen2.5-7B)**: Exceed the 6 GB VRAM limit when loaded alongside classifiers and context windows.
- **Quantizing Probing Model to INT4**: Would reduce memory to 1.5 GB but corrupts gradient and activation residual streams essential for task-drift detection.

## Consequences
### Positive
- Strict adherence to the 6 GB VRAM physical hardware envelope.
- High probing fidelity by retaining FP16 numeric precision for internal layer states.
- High classification throughput via compact sequence classification heads.

### Negative
- Requires model weight swapping when alternating between offline red-team generation and online gateway probing.
