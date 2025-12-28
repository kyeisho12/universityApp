University Career System — Template

Overview
- Monorepo with Flask backend and React (Vite) frontend.
- Includes docs, database placeholders, CI for tests/build.

Quick Start
- Backend:
	- Create virtual env and install deps: `pip install -r backend/requirements.txt`.
	- Copy `backend/.env.example` to `backend/.env`.
	- Run: `python backend/run.py`.
- Frontend:
	- `cd frontend && npm install`.
	- Copy `.env.example` to `.env` and set `VITE_API_URL`.
	- `npm run dev`.

Structure
- backend: Flask app, APIs, services, AI module placeholders, tests.
- frontend: React app structure with components, pages, services, styles.
- database: schema and seed placeholders.
- docs: architecture, API, AI guide, deployment, testing plans.
- .github/workflows: CI for backend tests and frontend build.

Notes
- This is a scaffold for faster development—fill in models, services, and routes.
- Choose and set a proper license in LICENSE.
