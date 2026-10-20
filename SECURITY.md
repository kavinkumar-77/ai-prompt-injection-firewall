# Security Policy

Project AEGIS is designed as a defense gateway for LLM applications. We take the security of our codebase, detection engine, and proxy infrastructure very seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.8.x   | :white_check_mark: |
| 0.7.x   | :white_check_mark: |
| < 0.7.0 | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability (such as a bypass heuristic, ReDoS flaw, memory leak, or authentication failure), please do **NOT** open a public issue.

Instead, please send an email to:
**`security-aegis@proton.me`** (or contact repository maintainers privately via GitHub Security Advisories).

Please include:
1. Description of the vulnerability.
2. Steps to reproduce or proof-of-concept payload.
3. Impact assessment.
4. Suggested remediation if available.

We will acknowledge receipt within 48 hours and provide regular updates on remediation progress.

## Zero Raw Data Guarantee

Project AEGIS is architected so that raw user prompts, chat messages, and document snippets are never written to disk, logged to standard output, or stored in relational databases. Payloads are salted and hashed with SHA-256 before persistence. Any pull request that compromises this guarantee will be rejected.
