# OmniYield — The Ultimate Manufacturing Solution

OmniYield is a multi-modal AI industrial diagnostic app. It fuses a defective part's image, live machine telemetry (temperature, vibration, pressure), and a machine manual excerpt into a single diagnosis: root cause + a specific repair action.

## Architecture

- **backend/** — FastAPI service. `POST /analyze` accepts an image + telemetry JSON + manual text, flags out-of-range sensor readings, and sends the image + context to Gemini (`gemini-2.0-flash`) to produce a structured `{root_cause, repair_action, confidence}` diagnosis.
- **frontend/** — React dashboard with a dark neon aesthetic (black background, cyan→purple gradient borders, glassmorphism). Split-screen: left side for image + telemetry input, right side displays the fetched diagnosis.

## Running locally

### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate   # Windows
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here   # or set in .env
uvicorn main:app --reload --port 8080
```

### Frontend

```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:8080" > .env
npm start
```

App runs at `http://localhost:3000`, backend at `http://localhost:8080`.

## Deployment

- **Backend → Google Cloud Run**: `backend/Dockerfile` builds on `python:3.11-slim-buster`, exposes port 8080.
  ```bash
  gcloud run deploy omniyield-backend --source backend --region <region> --set-env-vars GEMINI_API_KEY=your_key
  ```
- **Frontend → Firebase Hosting**: `frontend/firebase.json` serves the `build/` directory.
  ```bash
  cd frontend
  npm run build
  firebase deploy
  ```

## Environment variables

| Location | Variable | Purpose |
|---|---|---|
| backend | `GEMINI_API_KEY` | Google Gemini API key for the vision+text diagnostic agent |
| frontend | `REACT_APP_API_URL` | URL of the deployed/local backend |
