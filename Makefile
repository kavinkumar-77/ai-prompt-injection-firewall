.PHONY: help setup lint format test eval up down demo clean

PYTHON ?= python

help:
	@echo "Project AEGIS — AI Defense Gateway"
	@echo "Targets:"
	@echo "  setup   Install backend and development dependencies"
	@echo "  lint    Run ruff check, ruff format check, and mypy"
	@echo "  format  Auto-format with ruff format and ruff check --fix"
	@echo "  test    Run hermetic unit and integration tests"
	@echo "  eval    Run evaluation baseline suite"
	@echo "  up      Start the AEGIS gateway server"
	@echo "  down    Stop running AEGIS gateway processes"
	@echo "  demo    Start gateway and open local dashboard"

setup:
	$(PYTHON) -m pip install -r backend/requirements.txt

lint:
	ruff check .
	ruff format --check .
	mypy backend

format:
	ruff check --fix .
	ruff format .

test:
	pytest backend/tests

eval:
	$(PYTHON) -m pytest backend/tests/test_rules.py

up:
	uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload

down:
	@echo "Stopping gateway..."

demo:
	$(PYTHON) start_aegis.py
