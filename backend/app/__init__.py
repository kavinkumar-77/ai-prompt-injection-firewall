"""Backend application package for Project AEGIS."""

import sys
from pathlib import Path

# Ensure backend directory and project root are in sys.path
_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent

for _p in (str(_backend_dir), str(_root_dir)):
    if _p not in sys.path:
        sys.path.insert(0, _p)
