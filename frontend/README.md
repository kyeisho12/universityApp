# Frontend - React + Vite + Supabase

## Overview
- React 18 with React Router for navigation
- Vite for fast dev server and build
- Supabase for backend services (auth, database, storage)

## Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)

### Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy the example file
   copy .env.example .env    # Windows
   # or: cp .env.example .env   # Mac/Linux
   ```

3. **Add Supabase credentials to .env**
   - Get your project URL and anon key from [Supabase Dashboard](https://app.supabase.com/)
   - Update the values in `.env`

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   - Navigate to `http://localhost:5173`

### Build for Production
```bash
npm run build    # Creates optimized build in dist/
npm run preview  # Preview the production build
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── admin/       # Admin-specific components
│   ├── auth/        # Authentication forms
│   ├── common/      # Shared components
│   ├── interview/   # Interview-related components
│   └── student/     # Student-specific components
├── pages/           # Page components (routes)
├── services/        # API services and business logic
├── context/         # React context providers
├── hooks/           # Custom React hooks
├── lib/             # Third-party integrations (Supabase)
├── styles/          # Global styles
└── utils/           # Utility functions
```

## Available Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Backend Services

This frontend uses **Supabase** for:
- 🔐 Authentication (sign up, login, session management)
- 💾 Database (PostgreSQL)
- 📦 Storage (file uploads)
- ⚡ Real-time subscriptions

No local backend server needed!

## Troubleshooting

### White screen or blank page?
1. Check browser console (F12) for errors
2. Verify `.env` file exists with Supabase credentials
3. Clear browser cache and reload
4. Delete `node_modules` and run `npm install` again

### Supabase errors?
- Verify your Supabase URL and anon key are correct
- Check your Supabase project is active
- Review Supabase dashboard for any service issues

### Development server won't start?
- Check if port 5173 is already in use
- Try killing the process or using a different port
- Verify Node.js version: `node --version` (should be 18+)
