from __future__ import annotations

from app.layers.toolcall import AgentPolicy, ToolCallLayer


def test_toolcall_denied_tool_blocked():
    layer = ToolCallLayer()
    res = layer.process("system_shutdown", arguments={})
    assert res.score == 1.0
    assert any(ev.kind == "denied_tool_invocation" for ev in res.evidence)


def test_toolcall_allowed_tool_safe():
    layer = ToolCallLayer()
    res = layer.process("read_file", arguments={"path": "documents/report.txt"})
    assert res.score == 0.0
    assert res.label == "allowed_tool_call"


def test_toolcall_tainted_context_blocks_high_risk_tool():
    layer = ToolCallLayer()
    # When context is tainted, calling high-risk send_email must be blocked
    res = layer.process(
        "send_email",
        arguments={"to": "colleague@company.com", "body": "Summary"},
        is_tainted=True,
    )
    assert res.score >= 0.95
    assert any(ev.kind == "tainted_context_action" for ev in res.evidence)


def test_toolcall_untainted_send_email_domain_validation():
    layer = ToolCallLayer()
    # Allowed domain
    res_ok = layer.process(
        "send_email",
        arguments={"to": "alice@company.com", "body": "Notes"},
        is_tainted=False,
    )
    assert res_ok.score == 0.0

    # Unauthorized external domain
    res_bad = layer.process(
        "send_email",
        arguments={"to": "attacker@evil.org", "body": "Exfiltrated data"},
        is_tainted=False,
    )
    assert res_bad.score >= 0.90
    assert any(ev.kind == "unauthorized_email_destination" for ev in res_bad.evidence)


def test_toolcall_path_traversal_blocked():
    layer = ToolCallLayer()
    res = layer.process("read_file", arguments={"path": "../../etc/shadow"})
    assert res.score >= 0.90
    assert any(ev.kind == "path_traversal_attempt" for ev in res.evidence)


def test_toolcall_dangerous_bash_command_blocked():
    custom_policy = AgentPolicy(allowed_tools=["execute_bash"], high_risk_tools=[])
    layer = ToolCallLayer(policy=custom_policy)
    res = layer.process("execute_bash", arguments={"cmd": "rm -rf /"})
    assert res.score >= 0.95
    assert any(ev.kind.startswith("dangerous_arg_") for ev in res.evidence)


def test_toolcall_yaml_policy_loading(tmp_path):
    yaml_file = tmp_path / "custom_policy.yaml"
    yaml_file.write_text(
        """
name: test_policy
allowed_tools:
  - calculate
denied_tools:
  - send_email
high_risk_tools: []
allowed_email_domains: []
allow_tainted_high_risk: false
""",
        encoding="utf-8",
    )
    layer = ToolCallLayer.from_yaml(yaml_file)
    assert layer.policy.name == "test_policy"
    assert layer.policy.allowed_tools == ["calculate"]

    res = layer.process("send_email", arguments={})
    assert res.score == 1.0
