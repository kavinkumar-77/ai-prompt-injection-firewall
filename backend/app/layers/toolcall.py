"""Tool-call policy engine inspecting agent function arguments and actions.

Implements policy-as-code capability controls, tool allowlists/denylists,
parameter constraints, sandbox path validation, exfiltration checks,
and context taint tracking.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Final

import yaml

from app.core.models import Evidence, LayerResult

# Dangerous shell command patterns in tool arguments
DANGEROUS_COMMAND_PATTERNS: Final[list[tuple[str, re.Pattern[str]]]] = [
    ("recursive_deletion", re.compile(r"\brm\s+-(?:r|f|rf|fr)\s+[/~*]", re.IGNORECASE)),
    ("filesystem_format", re.compile(r"\bmkfs\b", re.IGNORECASE)),
    ("disk_dump", re.compile(r"\bdd\s+if=", re.IGNORECASE)),
    ("fork_bomb", re.compile(r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", re.IGNORECASE)),
    (
        "piped_remote_shell",
        re.compile(r"\b(?:curl|wget)\s+.*?\b\|\s*(?:bash|sh|zsh)\b", re.IGNORECASE),
    ),
    ("database_drop", re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE)),
    ("unbounded_deletion", re.compile(r"\bDELETE\s+FROM\s+\w+\s*;?$", re.IGNORECASE)),
]

# Sensitive path patterns
PATH_TRAVERSAL_PATTERN = re.compile(
    r"(?:\.\.[\\/]|[\\/]\.\.|/etc/|/var/run/|C:\\Windows|C:\\Program)",
    re.IGNORECASE,
)

# Suspicious argument exfiltration patterns
ARG_EXFIL_PATTERN = re.compile(
    r"https?://[^\s\"']+[?&](?:token|cookie|secret|key|data|auth|exfil)=[A-Za-z0-9_-]{8,}",
    re.IGNORECASE,
)


@dataclass
class AgentPolicy:
    """Capability specification for an autonomous agent or tool runner."""

    name: str = "default_agent_policy"
    allowed_tools: list[str] = field(
        default_factory=lambda: [
            "read_file",
            "search_web",
            "fetch_page",
            "write_note",
            "calculate",
            "send_email",
        ]
    )
    denied_tools: list[str] = field(
        default_factory=lambda: [
            "system_shutdown",
            "format_disk",
            "modify_firewall_rules",
            "execute_bash",
            "run_shell_command",
        ]
    )
    high_risk_tools: list[str] = field(
        default_factory=lambda: [
            "send_email",
            "execute_bash",
            "run_shell_command",
            "write_file",
            "delete_file",
            "http_request",
        ]
    )
    allowed_email_domains: list[str] = field(
        default_factory=lambda: [
            "company.com",
            "internal.net",
            "sandbox.local",
        ]
    )
    allow_tainted_high_risk: bool = False


class ToolCallLayer:
    """Validates LLM-generated agent tool calls against security policies and taint state."""

    def __init__(self, policy: AgentPolicy | None = None) -> None:
        self.layer_name = "toolcall"
        self.policy = policy or AgentPolicy()

    @classmethod
    def from_yaml(cls, yaml_path: str | Path) -> ToolCallLayer:
        """Loads capability policy from a YAML configuration file."""
        path = Path(yaml_path)
        if not path.is_file():
            return cls()
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        policy = AgentPolicy(
            name=data.get("name", "yaml_loaded_policy"),
            allowed_tools=data.get("allowed_tools", []),
            denied_tools=data.get("denied_tools", []),
            high_risk_tools=data.get("high_risk_tools", []),
            allowed_email_domains=data.get("allowed_email_domains", []),
            allow_tainted_high_risk=data.get("allow_tainted_high_risk", False),
        )
        return cls(policy=policy)

    def process(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        is_tainted: bool = False,
        agent_role: str | None = None,
    ) -> LayerResult:
        """Inspects tool invocation name and parameters for policy violations."""
        start_time = time.perf_counter()
        evidence: list[Evidence] = []
        score = 0.0

        # 1. Explicitly Denied Tools Check
        if tool_name in self.policy.denied_tools:
            score = 1.0
            evidence.append(
                Evidence(
                    kind="denied_tool_invocation",
                    span=None,
                    detail=f"Tool '{tool_name}' is in explicit capability denylist.",
                )
            )

        # 2. Allowlist Check (if allowed_tools is configured)
        if self.policy.allowed_tools and tool_name not in self.policy.allowed_tools:
            score = max(score, 0.95)
            evidence.append(
                Evidence(
                    kind="unregistered_tool_invocation",
                    span=None,
                    detail=(
                        f"Tool '{tool_name}' is not in allowed capabilities: "
                        f"{self.policy.allowed_tools}"
                    ),
                )
            )

        # 3. Context Taint Tracking
        # If context was influenced by untrusted external text and tool is high-risk
        is_blocked_taint = (
            is_tainted
            and tool_name in self.policy.high_risk_tools
            and not self.policy.allow_tainted_high_risk
        )
        if is_blocked_taint:
            score = max(score, 0.98)
            evidence.append(
                Evidence(
                    kind="tainted_context_action",
                    span=None,
                    detail=(
                        f"Agent context is tainted by untrusted external input; "
                        f"execution of high-risk tool '{tool_name}' is blocked."
                    ),
                )
            )

        # 4. Tool Argument Constraint Validation
        # Check: send_email domain allowlist
        if tool_name == "send_email":
            recipient = str(arguments.get("to", ""))
            domain = recipient.split("@")[-1].lower() if "@" in recipient else ""
            if domain and domain not in [d.lower() for d in self.policy.allowed_email_domains]:
                score = max(score, 0.94)
                evidence.append(
                    Evidence(
                        kind="unauthorized_email_destination",
                        span=None,
                        detail=(
                            f"Email recipient domain '{domain}' is not in allowed domains: "
                            f"{self.policy.allowed_email_domains}"
                        ),
                    )
                )

        # Check: Path traversal in file operations
        for arg_key, arg_val in arguments.items():
            if isinstance(arg_val, str) and arg_key in ("path", "filepath", "filename", "file"):
                if PATH_TRAVERSAL_PATTERN.search(arg_val):
                    score = max(score, 0.96)
                    evidence.append(
                        Evidence(
                            kind="path_traversal_attempt",
                            span=None,
                            detail=(
                                f"Path argument '{arg_key}' contains forbidden traversal: "
                                f"'{arg_val}'"
                            ),
                        )
                    )

        # 5. Dangerous Command Signatures in Arguments
        arg_dump = json.dumps(arguments)
        for name, pattern in DANGEROUS_COMMAND_PATTERNS:
            match = pattern.search(arg_dump)
            if match:
                score = max(score, 0.98)
                evidence.append(
                    Evidence(
                        kind=f"dangerous_arg_{name}",
                        span=(match.start(), match.end()),
                        detail=(
                            f"Dangerous command pattern detected in arguments: '{match.group()}'"
                        ),
                    )
                )

        # 6. Exfiltration URLs in arguments
        exfil_match = ARG_EXFIL_PATTERN.search(arg_dump)
        if exfil_match:
            score = max(score, 0.95)
            evidence.append(
                Evidence(
                    kind="argument_data_exfiltration",
                    span=(exfil_match.start(), exfil_match.end()),
                    detail=(
                        f"Suspicious exfiltration query URL in arguments: "
                        f"'{exfil_match.group()[:60]}'"
                    ),
                )
            )

        elapsed = (time.perf_counter() - start_time) * 1000
        if score >= 0.70:
            label = "unsafe_tool_action"
        elif score > 0:
            label = "tool_warning"
        else:
            label = "allowed_tool_call"

        return LayerResult(
            layer=self.layer_name,
            score=round(score, 4),
            label=label,
            evidence=evidence,
            latency_ms=round(elapsed, 3),
        )
