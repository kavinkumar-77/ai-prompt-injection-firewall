# ADR-006: SQLite as Default Storage with Optional Postgres Adapter

## Status
Accepted

## Context
Project AEGIS is designed for local-first deployment, development laptops, and lightweight edge environments. Requiring an external database service (like PostgreSQL) increases operational complexity and setup friction for local developers and offline testing.

## Decision
AEGIS uses SQLite as its default embedded database for threat event storage, audit logs, and configuration, while isolating data access through repository abstractions so that PostgreSQL can be configured via SQLAlchemy when deployed in multi-node production clusters.

To preserve privacy, all payloads and prompts are irreversibly hashed using salted SHA-256 before storage.

## Consequences
- **Positive:** Zero external infrastructure dependencies; single file database (`threats.db`); easy reset and inspection.
- **Negative:** SQLite write concurrency limits in high-throughput multi-process production environments (mitigated by asynchronous batching or Postgres connection in production).
