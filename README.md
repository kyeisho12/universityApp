# University Career Service Management System
### with an AI-Driven Mock Interview Module

A thesis project developed by students of the **College of Computer Studies, Tarlac State University (TSU)** in partial fulfillment of the requirements for the degree of Bachelor of Science in Computer Science, A.Y. 2025–2026.

---

## 📌 Overview

This system is a web-based platform designed to modernize and centralize the career service operations of Tarlac State University. It integrates traditional career management tools — such as student profiles, résumé building, job listings, and event coordination — with an AI-powered mock interview module that evaluates student responses using natural language processing.

The AI module uses a hybrid evaluation pipeline consisting of **Whisper** for speech-to-text transcription, **RoBERTa** for semantic similarity scoring against HR-validated ideal answers, **Zero-Shot Learning (ZSL)** for evaluating responses to unseen questions without retraining, and **Phi-3 Mini** for adaptive follow-up question generation. Evaluation scores are converted into a standardized TSU Likert scale (1–5) based on the STARR (Situation, Task, Action, Result, Reflection) rubric.

---

## 🤖 AI Evaluation Pipeline

```
Student Audio
     │
     ▼
Whisper (Speech-to-Text)
     │
     ▼
Transcribed Text
     │
     ▼
RoBERTa + ZSL
  ├── Answer matches HR-validated bank → RoBERTa Semantic Similarity
  └── Answer not matched → ZSL Text Classification
     │
     ▼
Likert Score (1–5)
     │
  ┌──┴──┐
  │     │
Follow-Up    No Follow-Up
Warranted    Warranted
(4-Step      │
Decision)    ▼
  │       Database + Next Question
  ▼
Phi-3 Mini (Follow-Up Generation)
  │
  └──► Back to Recording
```

**Follow-up decision process (4 steps):**
1. **Hard rule check** — limits each question to at most one follow-up
2. **Incoherence detection** — skips follow-up for vague or unclear answers
3. **Phi-3 JSON decision** — selects between follow-up, next bank question, or new question
4. **ZSL override** — forces follow-up if ZSL flagged missing STARR components

---

## ✨ Features

### Student Side
- Manage personal profiles including education, work experience, and career preferences
- Build and download résumés and cover letters
- Browse and apply for job and internship opportunities
- Register for career events, workshops, and seminars
- Conduct AI-powered mock interview sessions with real-time speech-to-text
- View STARR-based evaluation scores and performance metrics after each session
- Receive personalized session feedback identifying weakest STARR dimensions
- Track application progress, interview history, and event attendance

### Admin Side
- Manage student accounts and verify registrations
- Post, edit, and archive job and internship listings
- Create and manage career events and counseling sessions
- View, analyze, and export interview performance data (with question type tagging)
- Monitor student engagement through reports and monthly trend analytics

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Python, Flask, Gunicorn |
| Database | Supabase (PostgreSQL, Auth, Storage) |
| Speech Recognition | faster-whisper (OpenAI Whisper) |
| Semantic Evaluation | RoBERTa via sentence-transformers |
| Zero-Shot Classification | Hugging Face ZSL pipeline |
| Follow-Up Generation | Microsoft Phi-3 Mini (via Ollama) |

---

## 📁 Project Structure

```
universityApp/
├── frontend/               # React + TypeScript frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page-level components
│       ├── services/       # Supabase and API service layer
│       ├── context/        # React context providers
│       └── lib/            # Supabase client config
├── backend/                # Flask API + AI modules
│   └── app/
│       ├── ai_module/
│       │   ├── whisper/    # Speech-to-text transcription
│       │   ├── roberta/    # Semantic similarity scoring
│       │   ├── zero_shot/  # ZSL classification
│       │   ├── phi3/       # Follow-up question generation
│       │   └── scoring/    # Likert score conversion
│       ├── api/            # Flask route handlers
│       ├── services/       # Business logic
│       └── utils/          # Shared utilities
├── database/               # Schema and migrations
├── supabase/               # Supabase edge functions
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Ollama (for Phi-3 local inference)
- Supabase project (Auth, Database, Storage)

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env      # Fill in your Supabase credentials
npm run dev               # http://localhost:5173
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # Fill in your config
python -m app.main
```

### Phi-3 (Ollama) Setup

```bash
ollama pull phi3
ollama serve
```

---

## 👥 Proponents

- **Francisco, Guian Carlo V.**
- **Jose, Tomas G.**
- **Nabong, Gilber Mary Joy C.**

**Technical Adviser:** Ms. Raine Micaela Muñoz
**Subject Teacher:** Dr. Rogel L. Quilala

---

## 🏫 Institution

College of Computer Studies
Tarlac State University
A.Y. 2025 – 2026

---

## 📄 License

See [LICENSE](LICENSE) for details.
