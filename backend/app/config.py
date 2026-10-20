"""Application configuration using pydantic-settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    """Core settings for Project AEGIS Defense Gateway."""

    app_name: str = "Project AEGIS Security Gateway"
    app_version: str = "1.0.0"
    app_env: str = "development"
    debug: bool = False

    host: str = "127.0.0.1"
    port: int = 8000

    # Secret salt for payload hashing (ensures zero data exposure in logs & db)
    secret_salt: str = "aegis_default_production_salt"

    # Database
    db_path: str = str(ROOT_DIR / "threats.db")

    # Upstream inference
    upstream_llm_url: str = "http://localhost:11434/v1"
    upstream_timeout_seconds: float = 30.0

    # Privacy & Safety
    store_raw_snippets: bool = False
    fail_open: bool = False

    # Security Hardening
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    enable_security_headers: bool = True
    max_request_size_bytes: int = 5 * 1024 * 1024  # 5 MB
    max_input_length_chars: int = 50_000  # Cap before ML and sliding window processing

    model_config = SettingsConfigDict(
        env_prefix="AEGIS_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
