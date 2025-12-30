# University App - Quick Setup Guide (Sprint 1)

**Current Focus:** Frontend only with Supabase backend

Follow these simple steps to get the application running on your machine.

## Prerequisites

You only need:
- **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/downloads)

That's it! No Python, no Flask, no virtual environments needed. 🎉

## Step-by-Step Setup Instructions

### 1️⃣ Clone the Repository (Skip if already cloned)

```bash
git clone https://github.com/kyeisho12/universityApp.git
cd universityApp
```

### 2️⃣ Navigate to Frontend Directory

```bash
cd frontend
```

### 3️⃣ Install Dependencies

```bash
npm install
```

This may take a few minutes. Wait for it to complete.

### 4️⃣ Create Environment File

Copy `.env.example` to `.env`:

**Windows (PowerShell):**
```powershell
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

The default values should work! You don't need to edit anything.

### 5️⃣ Start the Development Server

```bash
npm run dev
```

✅ **You should see something like:**
```
  VITE v6.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 6️⃣ Access the Application

Open your web browser and navigate to:
```
http://localhost:5173
```

You should now see the application running! 🎉

---

## Common Issues & Solutions

### ❌ White Screen / Blank Page

**Possible causes:**

1. **Missing dependencies**
   - Solution: Delete `node_modules` and reinstall:
     ```bash
     cd frontend
     rm -rf node_modules
     npm install
     npm run dev
     ```

2. **Browser console errors**
   - Press F12 in your browser to open Developer Tools
   - Check the Console tab for error messages
   - Common fix: Clear browser cache (Ctrl+Shift+Delete)

3. **Old .env file with Flask API URL**
   - Solution: Delete your `.env` file and recreate it from `.env.example`
   - Make sure it doesn't reference `http://localhost:5000`

### ❌ Port Already in Use (Port 5173)

**Windows PowerShell:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process
```

**Mac/Linux:**
```bash
lsof -ti:5173 | xargs kill
```

Then run `npm run dev` again.

### ❌ "npm: command not found"

**Solution:** You need to install Node.js
- Download from [nodejs.org](https://nodejs.org/)
- Restart your terminal after installation
- Verify with: `node --version`

---

## Quick Checklist Before Running

- [ ] Node.js is installed (`node --version` works)
- [ ] You're in the `frontend` folder
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file exists (copied from `.env.example`)
- [ ] Dev server is running (`npm run dev`)

---

## Daily Development Workflow

After initial setup, just run these two commands:

```bash
cd universityApp/frontend
npm run dev
```

Open browser to `http://localhost:5173`

That's it! 🚀

---

## Project Structure Reference

```
universityApp/
├── backend/          # ⏳ Placeholder for future sprints
├── frontend/         # ✅ Active development (React + Vite + Supabase)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.js
└── SETUP_GUIDE.md   # This file
```

---

## Current Technology Stack

- **Frontend:** React 18 + Vite
- **Routing:** React Router
- **Backend:** Supabase (handles auth, database, storage)
- **Styling:** CSS/TailwindCSS (check your project)

---

## Need Help?

If you're still experiencing issues:
1. Make sure you're in the `frontend` folder
2. Try deleting `node_modules` and running `npm install` again
3. Check the browser console (F12) for error messages
4. Clear your browser cache
5. Share error messages with the team

---

## About the Backend Folder

The `backend/` folder is a **placeholder for future sprints**. 

For Sprint 1, we're using **Supabase** as our backend, so:
- ❌ No Python installation needed
- ❌ No Flask server to run
- ❌ No virtual environment setup
- ✅ Just frontend development!

The Flask backend will be implemented in a later sprint when needed.
