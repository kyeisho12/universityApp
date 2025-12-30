# University Career System

## 🚀 Sprint 1: Frontend Development

A modern university career management system built with React and Supabase.

### Current Status
✅ **Frontend Active** - React + Vite + Supabase  
⏳ **Backend** - Placeholder for future sprints

---

## Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- Git

### Setup (3 steps!)

```bash
# 1. Clone and navigate
git clone https://github.com/kyeisho12/universityApp.git
cd universityApp/frontend

# 2. Install and configure
npm install
copy .env.example .env    # Windows
# or: cp .env.example .env   # Mac/Linux

# 3. Run!
npm run dev
```

Open **http://localhost:5173** 🎉

📖 **Detailed setup:** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

## Technology Stack

- **Frontend:** React 18, Vite, React Router
- **Backend:** Supabase (Auth, Database, Storage)
- **Future:** Flask API (planned for later sprint)

---

## Project Structure

```
universityApp/
├── frontend/         # ✅ Active development
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API and service layer
│   │   ├── context/     # React context providers
│   │   └── lib/         # Supabase client
│   └── package.json
├── backend/          # ⏳ Placeholder for future sprints
├── docs/             # Documentation
└── SETUP_GUIDE.md    # Detailed setup instructions
```

---

## Development

### Available Scripts
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

### Troubleshooting
- **White screen?** Check browser console (F12) for errors
- **Port in use?** Kill process or use different port
- **Still stuck?** See [SETUP_GUIDE.md](SETUP_GUIDE.md) troubleshooting section

---

## Documentation

- [📘 Setup Guide](SETUP_GUIDE.md) - Complete setup instructions
- [🏗️ Architecture](docs/architecture.md) - System architecture
- [📚 API Docs](docs/api_documentation.md) - API reference
- [🧪 Testing Plan](docs/testing_plan.md) - Testing strategy

---

## Contributing

This is an active development project. For Sprint 1, focus is on frontend features.

### Current Sprint Goals
- Build core UI components
- Implement authentication with Supabase
- Create student and admin dashboards
- Set up routing and navigation

---

## Notes

- **Backend folder** is a structural placeholder - no setup needed for Sprint 1
- Using **Supabase** for all backend services currently
- **Flask API** will be implemented in a future sprint
- This is a learning project - experiment and iterate!

---

## License

See [LICENSE](LICENSE) file for details.
