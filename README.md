# UK Wind Forecast Monitor

This is a small web app I built for the Gridbricks full stack challenge.

The idea is simple. A UK energy company has to buy electricity one day before it's needed. Part of that power comes from wind, so they rely on wind forecasts to decide how much extra to buy. This app shows them which forecast they actually had at decision time, and how accurate those forecasts turned out to be in January 2026.

Live app: (add Vercel link here)

## What you can do in the app

There are two tabs.

**Daily Forecast** – pick a delivery date between 2 Jan and 1 Feb 2026. You'll see the forecast the trader would have used, the actual wind generation, and the error for every hour, both as a chart and a table.

**Forecast Accuracy** – a summary of the whole month (744 hours). It shows:
- the average error (MAE)
- the bias, i.e. whether the forecast is usually too high or too low
- the P90 error, which works as a safety buffer (90% of hours miss by less than this)
- the worst error in the month
- average error by hour of the day

In January the forecast was too high most of the time, by around 1.7 GW on average.

## How I pick the forecast

I assumed the trader makes the decision at 10:00 UK time on the day before delivery. For each hour of the delivery day, the app uses the most recent forecast published before that time. Anything published after 10:00 is ignored, because the trader couldn't have seen it yet.

The decision hour can be changed with the `DECISION_HOUR` setting.

A couple of other things worth mentioning:
- The forecast is hourly but actuals come every 30 minutes, so I only compare the full hours.
- Elexon returns everything in UTC. I define the decision time and the delivery day in UK time and convert to UTC, so it also works during British Summer Time. The frontend shows all times in UK time.

## Data

Both datasets come from the Elexon BMRS API, as given in the brief:
- `FUELHH` for actual generation (filtered to wind)
- `WINDFOR` for wind forecasts

## Tech

- React (Vite) with Recharts on the frontend
- Python with FastAPI on the backend
- Docker Compose to run both together

## Folder structure

```
.
├── docker-compose.yml
├── backend/
│   ├── main.py             routes and the forecast / accuracy logic
│   ├── elexon_client.py    one function used for all Elexon calls
│   ├── config.py           reads settings, with defaults
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx             header and tabs
    │   ├── api.js              all calls to the backend
    │   ├── format.js           UK time formatting
    │   └── components/
    │       ├── DayView.jsx
    │       ├── AccuracyView.jsx
    │       └── SummaryCard.jsx
    ├── Dockerfile
    └── .env.example
```

## API

- `GET /health`
- `GET /actuals?date=YYYY-MM-DD`
- `GET /forecast?date=YYYY-MM-DD`
- `GET /day?date=YYYY-MM-DD` – forecast, actual and error for each hour
- `GET /accuracy` – the January summary (cached after the first call)

## Running it

The easiest way is Docker:

```bash
docker compose up --build
```

Then open http://localhost:5173. The backend runs on http://localhost:8000.

If you'd rather run it without Docker:

```bash
# backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

```bash
# frontend (in another terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Some choices I made

- I didn't use a database. The data is read-only and fairly small, so I keep the monthly result in memory. In a real product I'd store it in a database or Redis.
- For the monthly summary I fetch all January data in two API calls and process it in memory, instead of calling Elexon once per day.
- The config has default values, so the app runs even without a `.env` file.
- CORS only allows the frontend URL and GET requests.

## Use of AI

I used Claude to help me write and debug parts of the code and to draft this README. I went through all the code, made sure I understood it, and tested it myself.