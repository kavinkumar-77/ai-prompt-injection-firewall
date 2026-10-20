"""Execution engine for the AEGIS Red-Team security evaluation harness.

Runs the adversarial attack corpus and benign control set against the AEGIS Gateway,
evaluates defense efficacy, and writes structured Markdown, JSON, and HTML reports.
"""

from __future__ import annotations

import json
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import yaml

# Support offline in-process testing
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from app.core.models import ScanRequest  # noqa: E402
from app.core.pipeline import pipeline  # noqa: E402
from redteam.mutators import ALL_MUTATORS  # noqa: E402

CORPUS_DIR = Path(__file__).resolve().parent / "corpus"
REPORTS_DIR = Path(__file__).resolve().parent / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


@dataclass
class TestCaseResult:
    id: str
    category: str
    owasp: str
    technique: str
    source: str
    expected: str
    actual_verdict: str
    risk_score: float
    passed: bool
    latency_ms: float
    is_mutated: bool = False
    mutator_name: str | None = None
    reasoning: str | None = None
    contributing_layers: list[str] = field(default_factory=list)


@dataclass
class RedTeamReport:
    timestamp: str
    target: str
    policy: str
    total_test_cases: int
    total_attacks: int
    attacks_detected: int
    detection_rate_pct: float
    total_controls: int
    control_false_positives: int
    false_positive_rate_pct: float
    latency_p50_ms: float
    latency_p95_ms: float
    category_metrics: dict[str, dict[str, Any]]
    owasp_metrics: dict[str, dict[str, Any]]
    known_bypasses: list[dict[str, Any]]
    test_results: list[dict[str, Any]]


def load_corpus() -> list[dict[str, Any]]:
    """Loads all test cases from corpus YAML files."""
    cases = []
    for yml in sorted(CORPUS_DIR.glob("*.yaml")):
        with open(yml, encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if isinstance(data, list):
                cases.extend(data)
    return cases


def evaluate_single_case(
    case: dict[str, Any],
    target_url: str | None = None,
    policy_preset: str = "balanced",
    client: httpx.Client | None = None,
) -> TestCaseResult:
    """Evaluates a single test case either via HTTP or in-process pipeline."""
    payload = case["payload"]
    source = case.get("source", "user")
    expected = case["expected"]

    start = time.perf_counter()

    if target_url and client:
        try:
            resp = client.post(
                f"{target_url.rstrip('/')}/v1/scan",
                json={
                    "text": payload,
                    "source": source,
                    "policy_preset": policy_preset,
                    "metadata": {"test_id": case["id"]},
                },
                timeout=10.0,
            )
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            if resp.status_code == 200:
                data = resp.json()
                actual_verdict = data["verdict"]
                risk_score = float(data["risk_score"])
                reasoning = (
                    data.get("rationale")
                    or "; ".join(data.get("explanations", []))
                    or data.get("explanation")
                )
                layers = [lr["layer"] for lr in data.get("layers", []) if lr.get("score", 0) > 0.3]
            else:
                actual_verdict = "error"
                risk_score = 0.0
                reasoning = f"HTTP Error: {resp.status_code}"
                layers = []
        except Exception as ex:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            actual_verdict = "error"
            risk_score = 0.0
            reasoning = f"Connection Exception: {ex}"
            layers = []
    else:
        # Offline hermetic evaluation
        req = ScanRequest(
            text=payload,
            source=source,
            metadata={"test_id": case["id"]},
        )
        # Apply policy preset to decision engine
        if policy_preset:
            pipeline.decision_engine.set_preset(policy_preset)  # type: ignore[arg-type]
        res = pipeline.scan(req)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        actual_verdict = res.verdict
        risk_score = res.risk_score
        reasoning = res.rationale or "; ".join(res.explanations)
        layers = [lr.layer for lr in res.layers if lr.score > 0.3]

    if expected == "block":
        passed = actual_verdict in ("block", "redact", "warn")
    else:
        passed = actual_verdict == "allow"

    return TestCaseResult(
        id=case["id"],
        category=case["category"],
        owasp=case.get("owasp", "N/A"),
        technique=case.get("technique", "standard"),
        source=source,
        expected=expected,
        actual_verdict=actual_verdict,
        risk_score=risk_score,
        passed=passed,
        latency_ms=elapsed_ms,
        is_mutated=case.get("is_mutated", False),
        mutator_name=case.get("mutator_name"),
        reasoning=reasoning,
        contributing_layers=layers,
    )


def run_redteam_suite(
    target_url: str | None = None,
    policy_preset: str = "balanced",
    mutate: bool = False,
) -> RedTeamReport:
    """Executes the complete test corpus and generates performance metrics."""
    base_cases = load_corpus()
    cases_to_run = list(base_cases)

    if mutate:
        # Generate mutated variants of attack cases
        for case in base_cases:
            if case.get("expected") == "block":
                for mut_name, mut_fn in ALL_MUTATORS[:3]:  # Top 3 mutators
                    mutated_case = dict(case)
                    mutated_case["id"] = f"{case['id']}-MUT-{mut_name.upper()}"
                    mutated_case["payload"] = mut_fn(case["payload"])
                    mutated_case["is_mutated"] = True
                    mutated_case["mutator_name"] = mut_name
                    cases_to_run.append(mutated_case)

    results: list[TestCaseResult] = []
    client = httpx.Client() if target_url else None

    try:
        for case in cases_to_run:
            res = evaluate_single_case(case, target_url, policy_preset, client)
            results.append(res)
    finally:
        if client:
            client.close()

    # Calculate metrics
    attacks = [r for r in results if r.expected == "block"]
    controls = [r for r in results if r.expected == "allow"]

    detected_attacks = [r for r in attacks if r.passed]
    fp_controls = [r for r in controls if not r.passed]

    detection_rate = (len(detected_attacks) / len(attacks) * 100.0) if attacks else 0.0
    fpr = (len(fp_controls) / len(controls) * 100.0) if controls else 0.0

    latencies = sorted(r.latency_ms for r in results)
    p50 = latencies[len(latencies) // 2] if latencies else 0.0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0

    # Category breakdown
    category_metrics: dict[str, dict[str, Any]] = {}
    for r in results:
        cat = r.category
        if cat not in category_metrics:
            category_metrics[cat] = {"total": 0, "passed": 0, "failed": 0}
        category_metrics[cat]["total"] += 1
        if r.passed:
            category_metrics[cat]["passed"] += 1
        else:
            category_metrics[cat]["failed"] += 1

    for _cat, vals in category_metrics.items():
        vals["rate_pct"] = round((vals["passed"] / vals["total"]) * 100.0, 1)

    # OWASP breakdown
    owasp_metrics: dict[str, dict[str, Any]] = {}
    for r in attacks:
        o = r.owasp
        if o not in owasp_metrics:
            owasp_metrics[o] = {"total": 0, "detected": 0}
        owasp_metrics[o]["total"] += 1
        if r.passed:
            owasp_metrics[o]["detected"] += 1

    for _o, vals in owasp_metrics.items():
        vals["detection_rate_pct"] = round((vals["detected"] / vals["total"]) * 100.0, 1)

    # Known bypasses (missed attacks)
    known_bypasses = [
        {
            "id": r.id,
            "category": r.category,
            "owasp": r.owasp,
            "actual_verdict": r.actual_verdict,
            "risk_score": r.risk_score,
            "reasoning": r.reasoning,
        }
        for r in attacks
        if not r.passed
    ]

    report = RedTeamReport(
        timestamp=datetime.now(UTC).isoformat(),
        target=target_url or "in-process",
        policy=policy_preset,
        total_test_cases=len(results),
        total_attacks=len(attacks),
        attacks_detected=len(detected_attacks),
        detection_rate_pct=round(detection_rate, 2),
        total_controls=len(controls),
        control_false_positives=len(fp_controls),
        false_positive_rate_pct=round(fpr, 2),
        latency_p50_ms=round(p50, 2),
        latency_p95_ms=round(p95, 2),
        category_metrics=category_metrics,
        owasp_metrics=owasp_metrics,
        known_bypasses=known_bypasses,
        test_results=[asdict(r) for r in results],
    )

    return report


def write_reports(report: RedTeamReport, out_dir: Path = REPORTS_DIR) -> None:
    """Writes Markdown, JSON, and HTML reports."""
    out_dir.mkdir(parents=True, exist_ok=True)

    # Write JSON
    json_path = out_dir / "report.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, indent=2)

    # Write Markdown
    header_line = (
        f"**Generated:** {report.timestamp} | **Target:** `{report.target}` | "
        f"**Policy:** `{report.policy}`"
    )
    det_line = (
        f"- **Attacks Detected:** {report.attacks_detected} "
        f"(**{report.detection_rate_pct}%** Detection Rate)"
    )
    fpr_line = (
        f"- **Control False Positives:** {report.control_false_positives} "
        f"(**{report.false_positive_rate_pct}%** FPR)"
    )
    lat_line = (
        f"- **Inspection Latency:** P50: {report.latency_p50_ms} ms | "
        f"P95: {report.latency_p95_ms} ms"
    )

    md_lines = [
        "# Project AEGIS Red-Team Evaluation Report",
        header_line,
        "",
        "## 1. Executive Summary",
        f"- **Total Test Cases Evaluated:** {report.total_test_cases}",
        f"- **Attacks Tested:** {report.total_attacks}",
        det_line,
        f"- **Benign Controls Tested:** {report.total_controls}",
        fpr_line,
        lat_line,
        "",
        "## 2. OWASP LLM Top 10 Breakdown",
        "| OWASP Category | Total Tested | Neutralized | Detection Rate |",
        "|---|:---:|:---:|:---:|",
    ]

    for owasp_cat, data in report.owasp_metrics.items():
        md_lines.append(
            f"| `{owasp_cat}` | {data['total']} | {data['detected']} | "
            f"**{data['detection_rate_pct']}%** |"
        )

    md_lines.extend(
        [
            "",
            "## 3. Attack Category Breakdown",
            "| Category | Total Cases | Passed Cases | Success Rate |",
            "|---|:---:|:---:|:---:|",
        ]
    )

    for cat, data in report.category_metrics.items():
        md_lines.append(
            f"| `{cat}` | {data['total']} | {data['passed']} | **{data['rate_pct']}%** |"
        )

    md_lines.extend(
        [
            "",
            "## 4. Known Bypasses & Limitations Appendix",
        ]
    )

    if report.known_bypasses:
        md_lines.append(
            "The following attacks bypassed current defense thresholds and have been logged:"
        )
        for b in report.known_bypasses:
            md_lines.append(
                f"- **[{b['id']}]** ({b['category']}, {b['owasp']}): "
                f"Verdict `{b['actual_verdict']}`, Risk: {b['risk_score']:.2f}"
            )
    else:
        md_lines.append("Zero bypasses observed across all tested adversarial payloads.")

    md_path = out_dir / "report.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    # Write HTML
    table_rows = "".join(
        f"<tr><td>{k}</td><td>{v['total']}</td><td>{v['detected']}</td>"
        f"<td>{v['detection_rate_pct']}%</td></tr>"
        for k, v in report.owasp_metrics.items()
    )

    css_style = (
        "body { font-family: sans-serif; background: #0E121B; color: #E2E8F0; padding: 2rem; }\n"
        "h1, h2 { color: #FFFFFF; font-family: monospace; }\n"
        "table { width: 100%; border-collapse: collapse; margin-top: 1rem; }\n"
        "th, td { border: 1px solid #2D3748; padding: 8px 12px; text-align: left; }\n"
        "th { background: #1A202C; }\n"
        ".kpi { display: inline-block; background: #1A202C; padding: 1rem; border-radius: 8px; "
        "margin-right: 1rem; margin-bottom: 1rem; border: 1px solid #2D3748; }\n"
        ".metric { font-size: 1.8rem; font-weight: bold; color: #10B981; font-family: monospace; }"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AEGIS Red-Team Report</title>
  <style>
    {css_style}
  </style>
</head>
<body>
  <h1>Project AEGIS Red-Team Security Report</h1>
  <p>Target: <code>{report.target}</code> | Policy: <code>{report.policy}</code></p>
  <div>
    <div class="kpi">
      <div>Detection Rate</div>
      <div class="metric">{report.detection_rate_pct}%</div>
    </div>
    <div class="kpi">
      <div>FPR</div>
      <div class="metric">{report.false_positive_rate_pct}%</div>
    </div>
    <div class="kpi">
      <div>Cases</div>
      <div class="metric" style="color:#60A5FA;">{report.total_test_cases}</div>
    </div>
    <div class="kpi">
      <div>P95</div>
      <div class="metric" style="color:#F59E0B;">{report.latency_p95_ms} ms</div>
    </div>
  </div>
  <h2>OWASP Breakdown</h2>
  <table>
    <tr><th>Category</th><th>Total</th><th>Detected</th><th>Rate</th></tr>
    {table_rows}
  </table>
</body>
</html>"""

    html_path = out_dir / "report.html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
