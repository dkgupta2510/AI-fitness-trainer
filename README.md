# AI Fitness Trainer

Real-time pose detection, exercise tracking, video analysis, and AI-powered diet planning.

## Quick Start

### Backend (Terminal 1)

```powershell
cd C:\Users\hp\ai-fitness-trainer\backend
.\venv\Scripts\activate
python app.py
```

Runs at http://localhost:5000

### Frontend (Terminal 2)

```powershell
cd C:\Users\hp\ai-fitness-trainer\frontend
npm start
```

Opens at http://localhost:3000

## Configuration

Edit `backend/.env` and set your [Groq](https://console.groq.com/) API key for diet plans and video AI feedback:

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

Copy from `backend/.env.example` if needed. Do not commit `.env` to GitHub.

## Features

- Live camera pose detection (Squats, Bicep Curls, Lateral Raises)
- Rep counter and form feedback
- Video upload analysis
- AI diet planner (Vegan/Veg/Non-Veg/Eggitarian)
