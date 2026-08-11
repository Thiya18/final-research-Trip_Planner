"""
Step 2 - Generate the supporting data the ML modules need.

  data/hubs.csv                  start points (one per region + airport)
  data/travel_matrix.csv         estimated road distance / time / cost between every pair of places
  data/cost_reference.json       reference prices used by the budget estimator
  data/profile_assumptions.json  the distributions used to simulate users  <-- REPLACE with survey %s
  data/profiles_train.csv        1,000 simulated users for RL training
  data/profiles_val.csv          100 simulated users for tuning reward weights
  data/profiles_test.csv         60 simulated users (20 per region) for the final RL vs baseline test
  data/DUMMY_survey_TEST_ONLY.csv  40 fake rows ONLY for testing your analysis code. Never report it.

IMPORTANT
- Travel times here are straight-line distance x road factor / average speed. They are
  placeholders. In Iteration 1 replace them with real road times from OSRM / OpenRouteService /
  Google Distance Matrix (scripts/03 in the plan).
- profile_assumptions.json holds MY GUESSES. Once your real survey is in, put the real
  percentages there and re-run this script, so the simulated users follow your survey
  (that is what Section 4.6.3 of your report promises).

Run:  python scripts/02_generate_supporting_data.py
"""
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SEED = 42

# ------------------------------------------------------------------ hubs
HUBS = [
    ("H01", "Habarana / Dambulla base", "Cultural Triangle", 8.0350, 80.7500),
    ("H02", "Kandy city base", "Hill Country", 7.2906, 80.6337),
    ("H03", "Galle city base", "Southern Coast", 6.0535, 80.2210),
    ("H04", "Bandaranaike International Airport", "Airport", 7.1808, 79.8841),
]

# ------------------------------------------------------------------ costs (LKR, estimates to verify)
COST_REFERENCE = {
    "_note": "Approximate 2025-26 reference prices in LKR. Verify and cite sources before reporting.",
    "usd_to_lkr": 300,
    "transport_per_km": {"bus": 5, "tuk_tuk": 120, "private_car": 130},
    "meals_per_person_per_day": {"low": 2500, "medium": 6000, "high": 15000},
    "accommodation_per_room_per_night": {"low": 6000, "medium": 18000, "high": 45000},
    "road_factor": 1.35,
    "avg_speed_kmh": {"default": 38, "hill_country": 25},
}

# ------------------------------------------------------------------ profile assumptions (REPLACE)
ASSUMPTIONS = {
    "_note": "PLACEHOLDER distributions. Replace each with percentages from your real survey, then re-run.",
    "traveller_type": {"international": 0.5, "local": 0.5},
    "age_group": {"18-24": 0.35, "25-34": 0.35, "35-44": 0.18, "45+": 0.12},
    "travel_style": {"solo": 0.15, "couple": 0.25, "family": 0.25, "friends": 0.30, "group": 0.05},
    "interests": {"beach": 0.45, "cultural": 0.50, "nature_wildlife": 0.55, "adventure": 0.35,
                  "religious": 0.30, "food_dining": 0.30},
    "n_interests": {"1": 0.25, "2": 0.45, "3": 0.30},
    "trip_days": {"1": 0.20, "2": 0.30, "3": 0.25, "4": 0.15, "5": 0.10},
    "budget_level": {"low": 0.35, "medium": 0.45, "high": 0.20},
    "crowd_preference": {"peaceful": 0.35, "moderate": 0.40, "lively": 0.10, "no_preference": 0.15},
    "transport_mode": {"local": {"bus": 0.35, "private_car": 0.45, "tuk_tuk": 0.20},
                       "international": {"bus": 0.10, "private_car": 0.75, "tuk_tuk": 0.15}},
    "daily_hours_available": [8, 9, 10, 11],
    "budget_lkr_per_person_per_day": {
        "local": {"low": [5000, 10000], "medium": [10000, 25000], "high": [25000, 60000]},
        "international": {"low": [15000, 30000], "medium": [30000, 60000], "high": [60000, 150000]},
    },
}

GROUP_SIZE = {"solo": (1, 1), "couple": (2, 2), "family": (3, 5), "friends": (3, 6), "group": (6, 12)}
INTEREST_PHRASES = {
    "beach": ["relaxing on beaches and swimming", "sunny beaches and the ocean", "beaches, sunsets and sea views"],
    "cultural": ["ancient history and heritage sites", "ruins, old cities and local culture", "historical places and architecture"],
    "nature_wildlife": ["wildlife safaris and nature", "waterfalls, forests and animals", "seeing elephants and birds in nature"],
    "adventure": ["hiking and adventure activities", "climbing, trekking and surfing", "challenging hikes and outdoor thrills"],
    "religious": ["visiting temples and sacred places", "religious sites and pilgrimages", "peaceful temples and spiritual places"],
    "food_dining": ["trying local food and tea", "Sri Lankan cooking and spices", "food experiences and tea plantations"],
}
CROWD_PHRASES = {"peaceful": "I prefer quiet, peaceful places away from crowds.",
                 "moderate": "Some people around is fine, but not packed places.",
                 "lively": "I enjoy lively, popular places with a buzz.",
                 "no_preference": "Crowds do not matter much to me."}


def haversine_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def build_travel_matrix(dest):
    nodes = pd.concat([
        dest[["dest_id", "name", "region", "latitude", "longitude"]].rename(columns={"dest_id": "id"}),
        pd.DataFrame(HUBS, columns=["id", "name", "region", "latitude", "longitude"]),
    ], ignore_index=True)
    rf, sp = COST_REFERENCE["road_factor"], COST_REFERENCE["avg_speed_kmh"]
    rows = []
    for a in nodes.itertuples():
        for b in nodes.itertuples():
            if a.id == b.id:
                continue
            km = haversine_km(a.latitude, a.longitude, b.latitude, b.longitude) * rf
            speed = sp["hill_country"] if "Hill Country" in (a.region, b.region) else sp["default"]
            rows.append({"from_id": a.id, "to_id": b.id, "road_km_est": round(km, 1),
                         "drive_min_est": round(km / speed * 60 + 5),  # +5 min parking/access
                         "car_cost_lkr_est": round(km * COST_REFERENCE["transport_per_km"]["private_car"]),
                         "source": "haversine_estimate"})
    return pd.DataFrame(rows)


def pick(rng, dist):
    keys = list(dist.keys())
    p = np.array(list(dist.values()), dtype=float)
    return rng.choice(keys, p=p / p.sum())


def make_profiles(n, rng, prefix, region=None):
    A = ASSUMPTIONS
    regions = ["Cultural Triangle", "Hill Country", "Southern Coast"]
    hub_for = {"Cultural Triangle": "H01", "Hill Country": "H02", "Southern Coast": "H03"}
    rows = []
    for i in range(n):
        ttype = pick(rng, A["traveller_type"])
        style = pick(rng, A["travel_style"])
        k = int(pick(rng, A["n_interests"]))
        ip = np.array(list(A["interests"].values()))
        interests = list(rng.choice(list(A["interests"].keys()), size=k, replace=False, p=ip / ip.sum()))
        reg = region or rng.choice(regions)
        days = int(pick(rng, A["trip_days"]))
        blevel = pick(rng, A["budget_level"])
        lo, hi = A["budget_lkr_per_person_per_day"][ttype][blevel]
        per_day = int(round(rng.uniform(lo, hi), -2))
        gmin, gmax = GROUP_SIZE[style]
        group = int(rng.integers(gmin, gmax + 1))
        crowd = pick(rng, A["crowd_preference"])
        text = ("I am interested in " + " and ".join(rng.choice(INTEREST_PHRASES[x]) for x in interests)
                + ". " + CROWD_PHRASES[crowd])
        rows.append({
            "profile_id": f"{prefix}{i + 1:04d}", "traveller_type": ttype,
            "age_group": pick(rng, A["age_group"]), "travel_style": style, "group_size": group,
            "interests": ";".join(interests), "interest_text": text, "region": reg,
            "start_hub": hub_for[reg], "trip_days": days,
            "daily_hours": int(rng.choice(A["daily_hours_available"])),
            "budget_level": blevel, "budget_lkr_per_person_per_day": per_day,
            "total_budget_lkr": per_day * days * group,
            "crowd_preference": crowd, "transport_mode": pick(rng, A["transport_mode"][ttype]),
            "travel_month": int(rng.integers(1, 13)), "synthetic": True,
        })
    return pd.DataFrame(rows)


def make_dummy_survey(n, rng):
    lik = ["Strongly agree", "Agree", "Neutral", "Disagree", "Strongly disagree"]
    imp = ["Very important", "Important", "Neutral", "Less important", "Not important"]
    yn = ["Yes", "No", "Maybe"]
    rows = []
    for i in range(n):
        rows.append({
            "IS_DUMMY_DO_NOT_REPORT": True, "resp_id": f"DUMMY{i + 1:03d}",
            "Q1_age": rng.choice(["18-24", "25-34", "35-44", "45 and above"]),
            "Q2_type": rng.choice(["International tourist", "Local traveler"]),
            "Q3_frequency": rng.choice(["Rarely", "Sometimes", "Often", "Very often"]),
            "Q4_travel_type": rng.choice(["Solo", "Family", "Friends", "Couple", "Group"]),
            "Q5_destinations": ";".join(rng.choice(["Beaches", "Cultural sites", "Nature/wildlife", "Adventure",
                                                    "Religious places", "Food and dining"],
                                                   size=int(rng.integers(1, 4)), replace=False)),
            "Q6_budget_importance": rng.choice(imp), "Q7_time_importance": rng.choice(imp),
            "Q8_crowd_importance": rng.choice(imp),
            "Q9_crowd_pref": rng.choice(["Peaceful", "Moderate", "Lively", "No preference"]),
            "Q10_avoid_crowded": rng.choice(["Yes", "No", "Sometimes"]),
            "Q11_check_crowd": rng.choice(["Always", "Often", "Sometimes", "Never"]),
            "Q12_use_recommender": rng.choice(yn), "Q13_use_routes": rng.choice(yn),
            "Q14_use_budget": rng.choice(yn),
            "Q15_crowd_useful": rng.choice(["Very useful", "Useful", "Neutral", "Slightly useful", "Not useful"]),
            "Q16_personalised": rng.choice(lik), "Q17_budget_system": rng.choice(lik),
            "Q18_avoid_crowds_system": rng.choice(lik), "Q19_route_opt": rng.choice(lik),
            "X_trip_days": rng.choice(["1", "2", "3", "4", "5+"]),
            "X_budget_per_day": rng.choice(["< LKR 10,000", "LKR 10,000-25,000", "LKR 25,000-60,000", "> LKR 60,000"]),
        })
    return pd.DataFrame(rows)


def main():
    rng = np.random.default_rng(SEED)
    dest = pd.read_csv(DATA / "destinations.csv")

    pd.DataFrame(HUBS, columns=["hub_id", "name", "region", "latitude", "longitude"]).to_csv(DATA / "hubs.csv", index=False)
    tm = build_travel_matrix(dest)
    tm.to_csv(DATA / "travel_matrix.csv", index=False)
    (DATA / "cost_reference.json").write_text(json.dumps(COST_REFERENCE, indent=2))
    (DATA / "profile_assumptions.json").write_text(json.dumps(ASSUMPTIONS, indent=2))

    train = make_profiles(1000, rng, "TR")
    val = make_profiles(100, rng, "VA")
    test = pd.concat([make_profiles(20, rng, f"TE{r[:1]}", region=r)
                      for r in ["Cultural Triangle", "Hill Country", "Southern Coast"]], ignore_index=True)
    train.to_csv(DATA / "profiles_train.csv", index=False)
    val.to_csv(DATA / "profiles_val.csv", index=False)
    test.to_csv(DATA / "profiles_test.csv", index=False)

    make_dummy_survey(40, rng).to_csv(DATA / "DUMMY_survey_TEST_ONLY.csv", index=False)

    print(f"travel_matrix rows: {len(tm)}   train/val/test profiles: {len(train)}/{len(val)}/{len(test)}")
    print(test.groupby("region").size())


if __name__ == "__main__":
    main()
