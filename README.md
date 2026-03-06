# AI Internship Matching

This repository is organized as a multi-service workspace:

- `backend/` - Express + PostgreSQL API
- `frontend/` - React + Vite web app
- `python_ai/` - Flask-based resume analysis service

## Updated Structure

```text
backend/
  server.js
  .env.example
  src/
    app.js
    config/
      db.js
    utils/
      recommendation.js

frontend/
  .env.example
  src/
    config/
      api.js
    pages/
      Company.jsx
      Dashboard.jsx
      Login.jsx
      Signup.jsx
```

## Run

1. Backend
   - Copy `backend/.env.example` to `backend/.env` and update values.
   - Install deps: `cd backend && npm install`
   - Start: `npm run dev` (or `npm start`)

2. Frontend
   - Copy `frontend/.env.example` to `frontend/.env` if you need a different API URL.
   - Install deps: `cd frontend && npm install`
   - Start: `npm run dev`

3. Python AI (optional)
   - `cd python_ai`
   - `python -m venv venv`
   - `.\venv\Scripts\activate`
   - `pip install -r requirements.txt`
   - `python app.py`

## NLP Matching (TF-IDF)

- Student dashboard uses `POST /recommend-resume` when a resume PDF is selected.
- Backend forwards internship data to Python AI `POST /tfidf-match` and combines TF-IDF similarity with profile preferences.
- Configure Python AI URL in backend with `PYTHON_AI_URL` (default: `http://localhost:5001`).
