"""Backend application package for Project AEGIS."""

import sys
from pathlib import Path

# Ensure backend directory is in sys.path when invoked from workspace root
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
