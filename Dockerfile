# syntax=docker/dockerfile:1
# Project AEGIS Root Dockerfile (Gateway Service)

FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim-bookworm AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 aegis && \
    useradd -u 1001 -g aegis -m -s /bin/bash aegis

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=aegis:aegis backend/ /app/backend/
COPY --chown=aegis:aegis models/ /app/models/
COPY --chown=aegis:aegis policies/ /app/policies/
COPY --chown=aegis:aegis lab/ /app/lab/
COPY --chown=aegis:aegis scripts/ /app/scripts/

RUN mkdir -p /app/data && chown -R aegis:aegis /app/data

ENV PYTHONPATH=/app/backend:/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AEGIS_HOST=0.0.0.0 \
    AEGIS_PORT=8000 \
    AEGIS_APP_ENV=production \
    AEGIS_DB_PATH=/app/data/threats.db

USER aegis

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
