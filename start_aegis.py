"""Project AEGIS: One-Click Production Launcher & Orchestrator.

Starts the FastAPI Gateway backend, Vite Dashboard, and opens the demo environment.
Supervises processes and keeps services active until user interrupts with Ctrl+C.
"""

import os
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_PORT = 8000
DASHBOARD_PORT = 5173


def print_banner():
    banner = r"""
  =============================================================
     ____             _           _         _     _____ ____ ___ ____
    |  _ \ _ __ ___  (_) ___  ___| |_      / \   | ____/ ___|_ _/ ___|
    | |_) | '__/ _ \ | |/ _ \/ __| __|    / _ \  |  _|| |  _ | |\___ \
    |  __/| | | (_) || |  __/ (__| |_    / ___ \ | |__| |_| || | ___) |
    |_|   |_|  \___/_/ |\___|\___|\__|  /_/   \_\|_____\____|___|____/
                  |__/
       AI Prompt-Injection, Data-Leak & Visual Phishing Firewall
  =============================================================
    """
    print(banner)


def is_port_in_use(port: int) -> bool:
    """Checks whether a local TCP port is already open."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def check_backend_health(retries=20, delay=0.5, proc=None) -> bool:
    """Polls backend health check until operational or process terminates."""
    url = f"http://localhost:{BACKEND_PORT}/health"
    for _ in range(retries):
        if proc and proc.poll() is not None:
            return False
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(delay)
    return False


def main():
    print_banner()

    logs_dir = ROOT_DIR / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    backend_proc = None
    dashboard_proc = None

    # 1. Backend Gateway Management
    print("[*] 1/3 Starting Project AEGIS Backend Gateway (FastAPI)...")
    if is_port_in_use(BACKEND_PORT) and check_backend_health(retries=3, delay=0.3):
        print(f"    [+] Existing Backend Gateway detected ONLINE: http://localhost:{BACKEND_PORT}")
    else:
        backend_log = open(logs_dir / "backend.log", "w", encoding="utf-8")
        backend_cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--app-dir",
            str(ROOT_DIR / "backend"),
            "--port",
            str(BACKEND_PORT),
            "--host",
            "127.0.0.1",
        ]

        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=str(ROOT_DIR),
            stdout=backend_log,
            stderr=subprocess.STDOUT,
        )

        if check_backend_health(retries=25, delay=0.4, proc=backend_proc):
            print(f"    [+] Backend Gateway ONLINE: http://localhost:{BACKEND_PORT}")
            print(f"    [+] Swagger API Docs:      http://localhost:{BACKEND_PORT}/docs")
        else:
            print("    [!] Warning: Backend took longer than expected to start.")
            if backend_proc and backend_proc.poll() is not None:
                print(f"    [!] Backend failed to start (exit code {backend_proc.returncode}).")
                log_file = logs_dir / "backend.log"
                if log_file.exists():
                    print("--- Backend Error Log ---")
                    lines = log_file.read_text(encoding="utf-8", errors="ignore").splitlines()
                    for line in lines[-10:]:
                        print(f"    {line}")

    # 2. React Dashboard Management
    print("\n[*] 2/3 Starting Project AEGIS Threat Dashboard (Vite + React)...")
    if is_port_in_use(DASHBOARD_PORT):
        print(f"    [+] Existing Dashboard detected ONLINE: http://localhost:{DASHBOARD_PORT}")
    else:
        dashboard_dir = ROOT_DIR / "dashboard"
        dashboard_log = open(logs_dir / "dashboard.log", "w", encoding="utf-8")
        npm_cmd = "npm.cmd" if os.name == "nt" else "npm"

        dashboard_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=str(dashboard_dir),
            stdout=dashboard_log,
            stderr=subprocess.STDOUT,
        )
        print(f"    [+] Dashboard starting at: http://localhost:{DASHBOARD_PORT}")

    time.sleep(1.5)

    # 3. Launch Demo Environment in Browser
    demo_file = ROOT_DIR / "demo" / "attack-simulator.html"
    print("\n[*] 3/3 Launching Demo & Evaluation Suite...")
    print(f"    [+] Attack Simulator: file:///{demo_file.as_posix()}")

    try:
        webbrowser.open(f"http://localhost:{DASHBOARD_PORT}")
        webbrowser.open(f"file:///{demo_file.as_posix()}")
    except Exception:
        pass

    print("\n" + "=" * 61)
    print("  PROJECT AEGIS IS ACTIVE & PROTECTING BROWSING SESSIONS")
    print("  - React Dashboard:   http://localhost:5173")
    print("  - Backend Swagger:   http://localhost:8000/docs")
    print("  - Live Attack Lab:   http://localhost:5173 (Authentic Attack Studio)")
    print("  - Standalone SDK:    http://localhost:8000/aegis-shield.js (Zero-Extension)")
    print("  - Optional Ext:      extension/dist (Optional Chrome MV3 Extension)")
    print("=" * 61)
    print("\n[ACTIVE] Services running. Press Ctrl+C to stop all services...")

    try:
        while True:
            if backend_proc and backend_proc.poll() is not None:
                print(f"\n[!] Backend process stopped with exit code {backend_proc.returncode}.")
                break
            if dashboard_proc and dashboard_proc.poll() is not None:
                code = dashboard_proc.returncode
                print(f"\n[!] Dashboard process stopped with exit code {code}.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down AEGIS services...")
    finally:
        for proc, name in [(backend_proc, "Backend"), (dashboard_proc, "Dashboard")]:
            if proc and proc.poll() is None:
                print(f"[*] Stopping {name}...")
                proc.terminate()
                try:
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    proc.kill()
        print("[+] All services stopped safely.")


if __name__ == "__main__":
    main()
