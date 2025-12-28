Backend (Flask) Template

Overview
- Flask app factory in app/__init__.py
- API blueprint at /api with /api/health and /api/auth/*
- Config via app/config/settings.py and .env
- Basic tests with pytest under backend/tests

Getting Started
1. Create and activate a virtual environment.
2. Install dependencies: pip install -r requirements.txt
3. Copy .env.example to .env and adjust values.
4. Run server: python run.py

Project Layout
- app/api: Route blueprints (auth, students, etc.)
- app/models: Database models (placeholder)
- app/services: Business logic (placeholder)
- app/ai_module: AI components (placeholder)
- app/middleware: JWT and error handling (placeholder)
- app/utils: Helpers and utilities
- app/config: Settings and configurations

Testing
- Run: pytest
