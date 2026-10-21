from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from lab.tools.sandbox_tools import OUTBOX_FILE, read_file, send_email, write_note


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_sandbox_tools_read_and_jail():
    # Read legitimate internal file
    content = read_file("internal_policy.md")
    assert "ACME Corp" in content

    # Attempt jailbreak path traversal
    escaped = read_file("../../etc/shadow")
    assert "Access denied" in escaped


def test_sandbox_tools_send_email_and_outbox():
    res = send_email("alice@company.com", "Test Subject", "Test Body")
    assert "successfully queued" in res
    assert OUTBOX_FILE.is_file()
    outbox_text = OUTBOX_FILE.read_text(encoding="utf-8")
    assert "alice@company.com" in outbox_text


def test_sandbox_tools_write_note():
    res = write_note("test_note", "Meeting notes content.")
    assert "saved to sandbox/notes/" in res


def test_lab_api_list_scenarios(client: TestClient):
    resp = client.get("/v1/lab/scenarios")
    assert resp.status_code == 200
    scenarios = resp.json()
    assert len(scenarios) == 12
    ids = [s["id"] for s in scenarios]
    assert "scenario_01_direct_override" in ids
    assert "scenario_12_benign_control" in ids


def test_lab_api_get_scenario(client: TestClient):
    resp = client.get("/v1/lab/scenarios/scenario_01_direct_override")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "scenario_01_direct_override"
    assert "user_task" in data


def test_lab_api_run_scenario(client: TestClient):
    resp = client.post("/v1/lab/run", json={"scenario_id": "scenario_01_direct_override"})
    assert resp.status_code == 200
    comp = resp.json()
    assert comp["scenario_id"] == "scenario_01_direct_override"
    assert comp["off_result"]["attack_succeeded"] is True
    assert comp["on_result"]["attack_succeeded"] is False
    assert comp["on_result"]["verdict"] == "block"
    assert comp["defense_effective"] is True
    assert "execution_steps" in comp
    assert len(comp["execution_steps"]) == 5


def test_lab_api_run_scenario_stream(client: TestClient):
    with client.stream("GET", "/v1/lab/run/stream/scenario_01_direct_override") as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")
        chunks = list(resp.iter_lines())
        assert any("TARGET INITIALIZED" in chunk for chunk in chunks)
        assert any("AUDIT VERIFIED" in chunk for chunk in chunks)


def test_lab_api_get_report(client: TestClient):
    resp = client.get("/v1/lab/report")
    assert resp.status_code == 200
    report = resp.json()
    assert "asr_off_pct" in report
    assert "asr_on_pct" in report
    assert report["asr_off_pct"] == 100.0
    assert report["asr_on_pct"] == 0.0
