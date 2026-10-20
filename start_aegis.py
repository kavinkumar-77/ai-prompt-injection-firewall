"""Project AEGIS: Production Launcher & Orchestrator.

Backwards-compatible entrypoint forwarding directly to scripts/dev_up.py.
"""

import sys
from pathlib import Path

# Ensure root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from scripts.dev_up import dev_up  # noqa: E402

if __name__ == "__main__":
    sys.exit(dev_up())
