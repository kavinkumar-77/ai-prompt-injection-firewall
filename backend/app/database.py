"""SQLite threat logging database for Project AEGIS."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.schemas import ThreatEvent, ThreatStatsResponse

DB_PATH = Path(__file__).resolve().parent.parent / "threats.db"


def get_connection(db_path: Path | str = DB_PATH) -> sqlite3.Connection:
    """Creates a connection to the SQLite database."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Path | str = DB_PATH) -> None:
    """Initializes the database schema if not present."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS threat_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                attack_type TEXT NOT NULL,
                source_url TEXT,
                risk_score REAL NOT NULL,
                details TEXT NOT NULL
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON threat_events (timestamp DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_attack_type ON threat_events (attack_type)")
        conn.commit()


def log_threat(event: ThreatEvent, db_path: Path | str = DB_PATH) -> None:
    """Logs a new threat event to the database with temporal deduplication."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()

        # Check if identical attack type from same source_url was recorded recently
        cursor.execute(
            """
            SELECT id, timestamp FROM threat_events
            WHERE attack_type = ? AND source_url = ?
            ORDER BY timestamp DESC
            LIMIT 1
            """,
            (event.attack_type, event.source_url or ""),
        )
        recent = cursor.fetchone()
        if recent:
            try:
                from datetime import datetime

                last_dt = datetime.fromisoformat(recent[1].replace("Z", "+00:00"))
                curr_dt = datetime.fromisoformat(event.timestamp.replace("Z", "+00:00"))
                diff_sec = abs((curr_dt - last_dt).total_seconds())
            except Exception:
                diff_sec = 999.0

            # If within 15 seconds, update existing threat instead of creating duplicate
            if diff_sec < 15.0:
                cursor.execute(
                    """
                    UPDATE threat_events
                    SET timestamp = ?, risk_score = ?, details = ?
                    WHERE id = ?
                    """,
                    (
                        event.timestamp,
                        event.risk_score,
                        json.dumps(event.details),
                        recent[0],
                    ),
                )
                conn.commit()
                return

        cursor.execute(
            """
            INSERT OR REPLACE INTO threat_events (
                id, timestamp, attack_type, source_url, risk_score, details
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                event.id,
                event.timestamp,
                event.attack_type,
                event.source_url,
                event.risk_score,
                json.dumps(event.details),
            ),
        )
        conn.commit()


def clear_all_threats(db_path: Path | str = DB_PATH) -> None:
    """Clears all logged threat events from the database."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM threat_events")
        conn.commit()


def get_recent_threats(limit: int = 50, db_path: Path | str = DB_PATH) -> list[dict[str, Any]]:
    """Retrieves recent threat events ordered by timestamp descending."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, timestamp, attack_type, source_url, risk_score, details
            FROM threat_events
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        results: list[dict[str, Any]] = []
        for r in rows:
            try:
                parsed_details = json.loads(r["details"])
            except Exception:
                parsed_details = {"raw": r["details"]}
            results.append(
                {
                    "id": r["id"],
                    "timestamp": r["timestamp"],
                    "attack_type": r["attack_type"],
                    "source_url": r["source_url"] or "",
                    "risk_score": float(r["risk_score"]),
                    "details": parsed_details,
                }
            )
        return results


def get_threat_stats(db_path: Path | str = DB_PATH) -> ThreatStatsResponse:
    """Aggregates security threat counts and risk metrics."""
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM threat_events")
        total = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM threat_events WHERE attack_type = 'INJECTION'")
        injections = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM threat_events WHERE attack_type = 'EXFILTRATION'")
        exfiltrations = cursor.fetchone()[0] or 0

        cursor.execute("SELECT COUNT(*) FROM threat_events WHERE attack_type = 'PHISHING'")
        phishing = cursor.fetchone()[0] or 0

        cursor.execute("SELECT AVG(risk_score) FROM threat_events")
        avg_risk = cursor.fetchone()[0]
        avg_risk_score = round(float(avg_risk), 3) if avg_risk is not None else 0.0

        return ThreatStatsResponse(
            total_threats=total,
            injections_blocked=injections,
            exfiltrations_blocked=exfiltrations,
            phishing_blocked=phishing,
            avg_risk_score=avg_risk_score,
            system_status="ACTIVE_PROTECTION",
        )
