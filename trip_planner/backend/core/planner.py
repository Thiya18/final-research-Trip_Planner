"""One call that runs the whole pipeline: recommend -> sequence -> estimate budget -> metrics."""
import time

from . import baselines
from .budget import estimate, transport_cost
from .config import REWARD
from .profile import UserProfile
from .recommender import recommend
from .rl_policy import plan_with_rl, rl_available
from .simulator import TripSimulator

METHODS = ("rl", "greedy", "nearest")


def objective(sim: TripSimulator, reward=REWARD) -> float:
    """The reward of a finished itinerary, always scored with the TRUE crowd fit, so every method
    (including the no-crowd ablation) is judged on the same scale."""
    p, total = sim.p, 0.0
    for d in sim.itinerary():
        for s in d["stops"]:
            cost = s["fee_lkr"] + transport_cost(s["leg_km"], p)
            share = cost / p.activity_budget if p.activity_budget > 0 else 1.0
            total += (reward["w_pref"] * s["pref"] + reward["w_crowd"] * s["crowd_fit"]
                      - reward["w_travel"] * s["travel_min"] / 60 - reward["w_cost"] * share)
    days_used = sum(1 for d in sim.itinerary() if d["stops"])
    return total + reward["completion_bonus"] * days_used / p.trip_days


def metrics(sim: TripSimulator, budget: dict) -> dict:
    stops = [s for d in sim.itinerary() for s in d["stops"]]
    n = len(stops)
    return {
        "n_stops": n,
        "total_reward": round(objective(sim), 4),
        "mean_preference": round(sum(s["pref"] for s in stops) / n, 4) if n else 0.0,
        "total_travel_min": int(sum(s["travel_min"] for s in stops)),
        "crowd_suitability": round(sum(s["crowd_fit"] >= 0.7 for s in stops) / n, 4) if n else 0.0,
        "constraints_satisfied": bool(budget["within_budget"]),
    }


def run_method(p: UserProfile, candidates: list, method: str, reward=REWARD, model=None) -> TripSimulator:
    sim = TripSimulator(p, candidates, reward)
    if method == "greedy":
        return baselines.greedy(sim)
    if method == "nearest":
        return baselines.nearest(sim)
    if method == "rl":
        return plan_with_rl(sim, model)
    raise ValueError(f"unknown method {method}")


def plan(p: UserProfile, method: str = "rl") -> dict:
    t0 = time.perf_counter()
    warnings = []
    if method == "rl" and not rl_available():
        warnings.append("RL model not trained yet, so the greedy baseline was used.")
        method = "greedy"
    candidates = recommend(p)
    sim = run_method(p, candidates, method)
    days = sim.itinerary()
    budget = estimate(days, p)

    if p.activity_budget <= 0:
        warnings.append("Your budget only covers meals and rooms. Increase it to add paid visits.")
    elif not budget["within_budget"]:
        warnings.append("Estimated cost is above your budget.")
    empty = [d["day"] for d in days if not d["stops"]]
    if empty:
        warnings.append(f"No places fit on day(s) {', '.join(map(str, empty))}. Try more hours or budget.")

    route = [{"latitude": c[0], "longitude": c[1]} for c in [sim.data.coords(p.start_hub)]]
    route += [{"latitude": s["latitude"], "longitude": s["longitude"]} for d in days for s in d["stops"]]
    return {
        "method": method,
        "start": {"id": p.start_hub, "name": sim.data.name(p.start_hub),
                  "latitude": route[0]["latitude"], "longitude": route[0]["longitude"]},
        "recommendations": candidates,
        "itinerary": days,
        "route": route,
        "budget": budget,
        "metrics": metrics(sim, budget),
        "warnings": warnings,
        "response_ms": round((time.perf_counter() - t0) * 1000),
    }
