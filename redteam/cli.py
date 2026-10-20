"""CLI entrypoint for the aegis-redteam security test harness."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from redteam.runner import REPORTS_DIR, run_redteam_suite, write_reports


def main() -> int:
    """Parses command-line arguments, runs red-team harness, and enforces quality gates."""
    parser = argparse.ArgumentParser(
        prog="aegis-redteam",
        description="Project AEGIS Red-Team Security Evaluation Harness",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run red-team evaluation suite")
    run_parser.add_argument(
        "--target",
        type=str,
        default=None,
        help="Target AEGIS gateway URL (e.g. http://localhost:8000). If omitted, runs in-process.",
    )
    run_parser.add_argument(
        "--policy",
        type=str,
        default="balanced",
        choices=["strict", "balanced", "lenient"],
        help="Policy preset to evaluate against (default: balanced)",
    )
    run_parser.add_argument(
        "--mutate",
        action="store_true",
        help="Expand attack suite using obfuscation mutators (base64, homoglyph, html comments)",
    )
    run_parser.add_argument(
        "--out",
        type=str,
        default=str(REPORTS_DIR),
        help="Directory to save report outputs (report.md, report.json, report.html)",
    )
    run_parser.add_argument(
        "--min-detection-rate",
        type=float,
        default=85.0,
        help="Minimum attack detection rate threshold to pass gate (default: 85.0%%)",
    )
    run_parser.add_argument(
        "--max-fpr",
        type=float,
        default=5.0,
        help="Maximum false positive rate on controls to pass gate (default: 5.0%%)",
    )

    args = parser.parse_args()

    if args.command == "run":
        print("=" * 60)
        print("Starting AEGIS Red-Team Security Evaluation")
        target_str = args.target or "In-Process Hermetic"
        print(f"Target: {target_str} | Policy: {args.policy} | Mutate: {args.mutate}")
        print("=" * 60)

        report = run_redteam_suite(
            target_url=args.target,
            policy_preset=args.policy,
            mutate=args.mutate,
        )

        out_path = Path(args.out)
        write_reports(report, out_path)

        print("\n" + "=" * 60)
        print("RED-TEAM EVALUATION SUMMARY")
        print("=" * 60)
        print(f"Total Test Cases:       {report.total_test_cases}")
        print(f"Attacks Evaluated:      {report.total_attacks}")
        print(f"Attacks Intercepted:    {report.attacks_detected}")
        det_msg = f"{report.detection_rate_pct:.2f}% (Target >= {args.min_detection_rate}%)"
        print(f"Attack Detection Rate:  {det_msg}")
        print(f"Benign Controls:        {report.total_controls}")
        print(f"False Positives:        {report.control_false_positives}")
        fpr_msg = f"{report.false_positive_rate_pct:.2f}% (Target <= {args.max_fpr}%)"
        print(f"False Positive Rate:    {fpr_msg}")
        print(f"P95 Gateway Latency:    {report.latency_p95_ms:.2f} ms")
        print(f"Reports saved to:       {out_path.resolve()}")
        print("=" * 60)

        failed_gate = False
        if report.detection_rate_pct < args.min_detection_rate:
            print(
                f"[FAIL]: Detection rate {report.detection_rate_pct:.2f}% "
                f"< {args.min_detection_rate}%"
            )
            failed_gate = True
        if report.false_positive_rate_pct > args.max_fpr:
            print(
                f"[FAIL]: False positive rate {report.false_positive_rate_pct:.2f}% "
                f"> {args.max_fpr}%"
            )
            failed_gate = True

        if failed_gate:
            print("\n[GATE FAILED]: Security regression detected.")
            return 1

        print("\n[GATE PASSED]: AEGIS meets all security detection and zero-FPR thresholds.")
        return 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
