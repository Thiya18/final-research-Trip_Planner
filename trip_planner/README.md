# Lanka Trip Planner: research prototype

A context-aware trip planner for the Cultural Triangle, Hill Country and Southern Coast:
semantic recommendations, an RL itinerary model compared with two baselines, and a budget estimate,
shown in a React Native (Expo) mobile app.

```
trip_planner/
  data/        destinations, travel matrix, costs, simulated profiles      (scripts/ rebuild them)
  backend/     Python: recommender, simulator, baselines, RL, budget, FastAPI
  mobile/      Expo React Native app (5 screens)
```

## 1. Run the backend (your computer)

Needs Python 3.10-3.13.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000/docs to try every endpoint in the browser.
The first start downloads the Sentence-BERT model (about 90 MB). `GET /health` shows
`"embedder": "sentence-bert"` when it is active. Without internet it falls back to TF-IDF.

A trained RL model is included in `backend/models/`. It was trained on the TF-IDF matcher.
**Retrain it after you switch to Sentence-BERT or change the data**, because the RL agent learns
from the recommender's scores:

```bash
python -m rl.train                                            # main model, about 6-10 min on a laptop
python -m rl.train --no-crowd --out models/rl_nocrowd.zip     # ablation model
python -m rl.evaluate                                         # RQ3 tables + Wilcoxon tests -> backend/results/
```

For the 10 seeds in Section 3.11, train `--seed 0` to `--seed 9` with `--out models/seedN.zip`.
Then run `python -m rl.evaluate --models models/seed0.zip ... models/seed9.zip`.

Run tests: `pytest -q`

## 2. Run the app on your phone

Needs Node.js 20+ and the **Expo Go** app from the Play Store / App Store.

1. Find your computer's Wi-Fi IP address (Windows: `ipconfig`, look for IPv4; Mac: System Settings -> Wi-Fi -> Details).
2. Put it in `mobile/app.json` -> `expo.extra.apiUrl`, e.g. `"http://192.168.1.23:8000"`.
   You can also change it inside the app: home screen -> gear icon (top right) -> Server address -> Test connection.
3. Start the app:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
4. Scan the QR code with Expo Go (Android) or the Camera app (iPhone). The phone and computer must be on the same Wi-Fi.

Web preview on the computer: `npx expo start --web`. The map is a schematic there; the phone shows the real map.

**Problems?**
- "Cannot reach the server": check that the backend is running with `--host 0.0.0.0`, the IP is right, and both devices are on the same Wi-Fi. Allow Python through the Windows firewall.
- Campus Wi-Fi often blocks phone-to-laptop traffic. Use your phone's hotspot instead.

## 3. Use PostgreSQL instead of SQLite (Section 4.8)

Plans and feedback are saved to `backend/trip_planner.db` (SQLite) by default. For PostgreSQL:
```bash
pip install psycopg[binary]
set DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/trip_planner     # Mac/Linux: export
```
Tables `itineraries` and `feedback` are created automatically. Export the `feedback` table for Chapter 5.7.

## How a request flows

1. App sends preferences -> `POST /plan`.
2. `core/recommender.py`: semantic match (Sentence-BERT cosine) + category match, then filters for region, season and fee. Returns the top 15.
3. `core/simulator.py` + one planner: `rl_policy.py` (RL), or `baselines.py` (B1 greedy / B2 nearest-neighbour).
4. `core/budget.py`: fees + transport + meals + rooms.
5. The response holds recommendations, a day-by-day itinerary with times, the route, the budget and metrics. It is saved with a `plan_id` for feedback.

All weights (reward, scoring, filters) live in `backend/core/config.py`.
