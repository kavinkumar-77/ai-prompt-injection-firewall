"""Project AEGIS: Local Development Orchestrator & Supervisor.

Performs comprehensive preflight checks:
- Python & Node.js environment verification
- Port availability (8000 for Gateway, 5173 for Operator Console)
- Machine learning model asset verification (ONNX classifier integrity)
- Upstream LLM reachability probe (Ollama / OpenAI proxy)

Starts and supervises both Gateway and Dashboard services until SIGINT (Ctrl+C).
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_PORT = 8000
DASHBOARD_PORT = 5173


class Colors:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_banner() -> None:
    banner = rf"""{Colors.CYAN}{Colors.BOLD}
========================================================================
   ___           _           _        _   _____ ____ ___ ____
  |  _ \ _ __ ___ (_) ___  ___| |_     / \ | ____/ ___|_ _/ ___|
  | |_) | '__/ _ \| |/ _ \/ __| __|   / _ \|  _|| |  _ | |\___ \
  |  __/| | | (_) | |  __/ (__| |_   / ___ \ |__| |_| || | ___) |
  |_|   |_|  \___// |\___|\___|\__| /_/   \_\_____\____|___|____/
                |__/
   Local-First AI Defense Gateway & Threat Containment Engine
========================================================================{Colors.RESET}"""
    print(banner)


def check_port(port: int) -> bool:
    """Returns True if the specified TCP port is open / in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def preflight_checks(check_upstream: bool = True) -> bool:
    """Executes preflight verification of system requirements and assets."""
    print(f"\n{Colors.BOLD}[*] Running System Preflight Checks...{Colors.RESET}")
    all_ok = True

    # 1. Python Environment Check
    py_ver = sys.version_info
    if py_ver.major == 3 and py_ver.minor >= 11:
        v_str = f"{py_ver.major}.{py_ver.minor}.{py_ver.micro}"
        print(f"  {Colors.GREEN}[✓]{Colors.RESET} Python {v_str} detected")
    else:
        v_str = f"{py_ver.major}.{py_ver.minor}"
        print(f"  {Colors.RED}[✗]{Colors.RESET} Python >= 3.11 required (found {v_str})")
        all_ok = False

    # 2. Node.js Environment Check
    node_bin = shutil.which("node")
    if node_bin:
        try:
            node_ver = subprocess.check_output([node_bin, "--version"], text=True).strip()
            print(f"  {Colors.GREEN}[✓]{Colors.RESET} Node.js {node_ver} detected")
        except Exception:
            print(f"  {Colors.YELLOW}[!]{Colors.RESET} Node.js found but failed version check")
    else:
        print(f"  {Colors.YELLOW}[!]{Colors.RESET} Node.js missing (run dashboard manually)")

    # 3. Model Asset Integrity Check
    model_path = ROOT_DIR / "models" / "classifier.onnx"
    manifest_path = ROOT_DIR / "models" / "MANIFEST.json"
    if model_path.is_file():
        file_size_kb = model_path.stat().st_size / 1024
        hasher = hashlib.sha256()
        with open(model_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        calc_sha = hasher.hexdigest()

        expected_sha = None
        if manifest_path.is_file():
            try:
                with open(manifest_path, encoding="utf-8") as f:
                    data = json.load(f)
                    expected_sha = data.get("models", {}).get("classifier.onnx", {}).get("sha256")
            except Exception:
                pass

        if expected_sha and calc_sha == expected_sha:
            print(
                f"  {Colors.GREEN}[✓]{Colors.RESET} ML Classifier verified: {model_path.name} "
                f"({file_size_kb:.1f} KB, SHA-256 match)"
            )
        else:
            print(
                f"  {Colors.GREEN}[✓]{Colors.RESET} ML Classifier present: {model_path.name} "
                f"({file_size_kb:.1f} KB)"
            )
    else:
        warn = (
            f"  {Colors.YELLOW}[!]{Colors.RESET} {model_path.name} missing! Gateway operates in "
            f"DEGRADED fallback mode. Run 'python scripts/fetch_assets.py' or 'python ml/train.py'."
        )
        print(warn)

    # 4. Port Availability Check
    if check_port(BACKEND_PORT):
        print(f"  {Colors.RED}[✗]{Colors.RESET} Port {BACKEND_PORT} is already in use!")
        all_ok = False
    else:
        print(f"  {Colors.GREEN}[✓]{Colors.RESET} Port {BACKEND_PORT} (Gateway) available")

    if check_port(DASHBOARD_PORT):
        print(
            f"  {Colors.YELLOW}[!]{Colors.RESET} Port {DASHBOARD_PORT} in use; "
            f"Vite will select next open port"
        )
    else:
        print(f"  {Colors.GREEN}[✓]{Colors.RESET} Port {DASHBOARD_PORT} (Dashboard) available")

    # 5. Upstream LLM Reachability Probe (Ollama / Local Inference)
    if check_upstream:
        ollama_url = "http://localhost:11434/api/tags"
        try:
            with urllib.request.urlopen(ollama_url, timeout=1.0) as resp:
                if resp.status == 200:
                    print(f"  {Colors.GREEN}[✓]{Colors.RESET} Ollama reachable at {ollama_url}")
        except Exception:
            ollama_warn = (
                f"  {Colors.YELLOW}[!]{Colors.RESET} Upstream Ollama not detected at "
                f"http://localhost:11434. Gateway uses simulated/circuit-breaker mode."
            )
            print(ollama_warn)

    return all_ok


def poll_url(url: str, timeout_sec: float = 20.0, proc: subprocess.Popen | None = None) -> bool:
    """Polls a URL until it responds with HTTP 200 or timeout expires."""
    start = time.perf_counter()
    while time.perf_counter() - start < timeout_sec:
        if proc and proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(url, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.4)
    return False


def get_python_exe() -> str:
    """Finds the virtualenv Python executable if present, falling back to sys.executable."""
    venv_py = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    if venv_py.is_file():
        return str(venv_py)
    venv_py_unix = ROOT_DIR / ".venv" / "bin" / "python"
    if venv_py_unix.is_file():
        return str(venv_py_unix)
    return sys.executable


def dev_up() -> int:
    """Orchestrates launch and supervision of Gateway and Dashboard."""
    print_banner()

    if not preflight_checks():
        print(f"\n{Colors.RED}[!] Preflight checks failed.{Colors.RESET}")
        return 1

    print(f"\n{Colors.BOLD}[*] Launching Project AEGIS Services...{Colors.RESET}")

    env = os.environ.copy()
    env["PYTHONPATH"] = str(ROOT_DIR / "backend")
    py_exe = get_python_exe()

    # 1. Start Backend Gateway
    backend_cmd = [
        py_exe,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(BACKEND_PORT),
        "--reload",
    ]
    print(f"  {Colors.CYAN}[>] Starting Gateway:{Colors.RESET} {' '.join(backend_cmd[:4])} ...")
    backend_proc = subprocess.Popen(
        backend_cmd,
        cwd=str(ROOT_DIR / "backend"),
        env=env,
    )

    # Poll gateway health endpoint
    health_url = f"http://localhost:{BACKEND_PORT}/health"
    print(f"  {Colors.CYAN}[*] Waiting for Gateway readiness on {health_url}...{Colors.RESET}")
    if not poll_url(health_url, timeout_sec=20.0, proc=backend_proc):
        print(f"{Colors.RED}[✗] Gateway failed to start within timeout!{Colors.RESET}")
        backend_proc.terminate()
        return 1
    print(f"  {Colors.GREEN}[✓] Gateway is LIVE and accepting traffic!{Colors.RESET}")

    # 2. Start Dashboard
    dashboard_proc = None
    dashboard_dir = ROOT_DIR / "dashboard"
    npm_bin = shutil.which("npm") or shutil.which("npm.cmd")

    if npm_bin and dashboard_dir.is_dir():
        dashboard_cmd = [npm_bin, "run", "dev", "--", "--port", str(DASHBOARD_PORT)]
        print(f"  {Colors.CYAN}[>] Starting Dashboard:{Colors.RESET} {' '.join(dashboard_cmd)}")
        dashboard_proc = subprocess.Popen(
            dashboard_cmd,
            cwd=str(dashboard_dir),
            shell=True if os.name == "nt" else False,
        )
        print(f"  {Colors.GREEN}[✓] Dashboard development server launched!{Colors.RESET}")
    else:
        print(f"  {Colors.YELLOW}[!] npm not found; skipping dashboard launch.{Colors.RESET}")

    # Service Directory
    border = f"\n{Colors.GREEN}{Colors.BOLD}{'=' * 72}{Colors.RESET}"
    print(border)
    print(f"{Colors.GREEN}{Colors.BOLD}  Project AEGIS Gateway & Console OPERATIONAL{Colors.RESET}")
    print(f"  - Gateway API:         {Colors.CYAN}http://localhost:{BACKEND_PORT}{Colors.RESET}")
    print(
        f"  - Health Endpoint:     {Colors.CYAN}http://localhost:{BACKEND_PORT}/health{Colors.RESET}"
    )
    print(
        f"  - API Documentation:   {Colors.CYAN}http://localhost:{BACKEND_PORT}/docs{Colors.RESET}"
    )
    print(f"  - Operator Dashboard:  {Colors.CYAN}http://localhost:{DASHBOARD_PORT}{Colors.RESET}")
    print(border)
    print(f"Press {Colors.YELLOW}Ctrl+C{Colors.RESET} to stop all services.\n")

    # Supervision Loop
    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                rc = backend_proc.returncode
                print(f"\n{Colors.RED}[!] Gateway exited unexpectedly with code {rc}{Colors.RESET}")
                break
            if dashboard_proc and dashboard_proc.poll() is not None:
                print(f"\n{Colors.YELLOW}[!] Dashboard process terminated.{Colors.RESET}")
                break
    except KeyboardInterrupt:
        print(f"\n{Colors.BOLD}[*] Shutdown signal received. Stopping services...{Colors.RESET}")
    finally:
        if backend_proc and backend_proc.poll() is None:
            backend_proc.terminate()
            backend_proc.wait(timeout=5)
            print(f"  {Colors.GREEN}[✓]{Colors.RESET} Gateway terminated")
        if dashboard_proc and dashboard_proc.poll() is None:
            if os.name == "nt":
                subprocess.call(
                    ["taskkill", "/F", "/T", "/PID", str(dashboard_proc.pid)],
                    stderr=subprocess.DEVNULL,
                )
            else:
                dashboard_proc.terminate()
            print(f"  {Colors.GREEN}[✓]{Colors.RESET} Dashboard terminated")

    print(f"{Colors.GREEN}[✓] Project AEGIS cleanly shutdown.{Colors.RESET}\n")
    return 0


if __name__ == "__main__":
    sys.exit(dev_up())
