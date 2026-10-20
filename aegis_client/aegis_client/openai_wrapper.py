"""OpenAI client wrapper to route requests through Project AEGIS Gateway."""

from __future__ import annotations

from typing import Any


def wrap_openai(client: Any, gateway_url: str = "http://localhost:8000/v1") -> Any:
    """Configures an OpenAI client to route calls through the AEGIS defense proxy.

    Example:
    ```python
    import openai
    from aegis_client import wrap_openai

    client = wrap_openai(openai.OpenAI(api_key="sk-test"), gateway_url="http://localhost:8000/v1")
    response = client.chat.completions.create(model="llama3", messages=[...])
    ```
    """
    clean_url = gateway_url.rstrip("/")
    if not clean_url.endswith("/v1"):
        clean_url = f"{clean_url}/v1"

    # Set base_url on the OpenAI client instance
    client.base_url = clean_url
    return client
