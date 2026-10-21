"""Seed realistic demo security events into Project AEGIS for evaluation and UI testing.

All seeded events are explicitly marked with `is_demo_seed: True` and
source: `demo_seed` so they are never confused with real operational telemetry.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.storage.demo_seed import DEMO_SEEDED_EVENTS, hash_text, seed_demo_events  # noqa: E402

__all__ = ["DEMO_SEEDED_EVENTS", "hash_text", "seed_demo_events"]

if __name__ == "__main__":
    count = seed_demo_events()
    print(f"Successfully seeded {count} labeled demo security events.")
