.PHONY: help setup lint format test eval redteam up down demo docker-build docker-up docker-down audit bench clean

PYTHON ?= python

help:
	@echo "Project AEGIS — AI Defense Gateway"
	@echo "Targets:"
	@echo "  setup         Install backend and development dependencies"
	@echo "  lint          Run ruff check, ruff format check, and mypy"
	@echo "  format        Auto-format with ruff format and ruff check --fix"
	@echo "  test          Run hermetic unit and integration tests"
	@echo "  eval          Run ML evaluation baseline suite"
	@echo "  redteam       Run automated red-team security benchmark"
	@echo "  up            Start gateway and dashboard development supervisor"
	@echo "  down          Stop running AEGIS gateway processes"
	@echo "  demo          Start supervisor and launch operator console"
	@echo "  docker-build  Build Docker containers for gateway and dashboard"
	@echo "  docker-up     Launch containerized stack with docker compose"
	@echo "  docker-down   Stop containerized stack"
	@echo "  audit         Run security dependency vulnerability audit"
	@echo "  bench         Execute concurrency and load testing benchmark"

setup:
	$(PYTHON) -m pip install -r backend/requirements.txt
	$(PYTHON) -m pip install -e aegis_client

lint:
	ruff check .
	ruff format --check .
	mypy backend aegis_client

format:
	ruff check --fix .
	ruff format .

test:
	pytest backend/tests

eval:
	$(PYTHON) ml/evaluate.py

redteam:
	$(PYTHON) -m redteam.cli --corpus redteam/corpus --format all

up:
	$(PYTHON) scripts/dev_up.py

down:
	@echo "Stopping gateway..."

demo:
	$(PYTHON) scripts/dev_up.py

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

audit:
	pip-audit --desc || true

bench:
	$(PYTHON) scripts/load_test.py
