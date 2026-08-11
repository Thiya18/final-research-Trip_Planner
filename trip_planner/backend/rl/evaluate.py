"""RQ3 evaluation: RL vs B1 Greedy vs B2 Nearest-neighbour on the 60 test profiles (+ no-crowd ablation).

Run from the backend folder after training:
    python -m rl.evaluate
    python -m rl.evaluate --models models/seed0.zip models/seed1.zip ...   # several seeds -> mean and SD

Outputs (backend/results/):
    per_profile.csv   every profile x method with all metrics   -> Chapter 5 tables
    summary.csv       mean / SD per method
    wilcoxon.csv      RL vs each baseline: W, p-value, effect size r
"""
import argparse
import time
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import wilcoxon

from core.budget import estimate
from core.config import BACKEND_DIR, DATA_DIR, MODEL_DIR, RL_MODEL_PATH
from core.planner import metrics, run_method
from core.profile import UserProfile
from core.recommender import recommend
from core.rl_policy import load_model

OUT = BACKEND_DIR / "results"
METRICS = ["total_reward", "mean_preference", "n_stops", "total_travel_min", "crowd_suitability",
           "constraints_satisfied", "runtime_ms"]


def evaluate_one(p, cands, method, model=None):
    t0 = time.perf_counter()
    sim = run_method(p, cands, method, model=model)
    ms = (time.perf_counter() - t0) * 1000
    m = metrics(sim, estimate(sim.itinerary(), p))
    m["runtime_ms"] = round(ms, 2)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=[str(RL_MODEL_PATH)])
    ap.add_argument("--ablation", default=str(MODEL_DIR / "rl_nocrowd.zip"))
    args = ap.parse_args()
    OUT.mkdir(exist_ok=True)

    profiles = [UserProfile.from_dict(r) for r in pd.read_csv(DATA_DIR / "profiles_test.csv").to_dict("records")]
    cands = {p.profile_id: recommend(p) for p in profiles}
    cands_nc = {p.profile_id: recommend(p, use_crowd=False) for p in profiles}
    rows = []
    for p in profiles:
        base = {"profile_id": p.profile_id, "region": p.region, "traveller_type": p.traveller_type}
        for method in ("greedy", "nearest"):
            rows.append({**base, "method": method, "seed": 0, **evaluate_one(p, cands[p.profile_id], method)})
    for seed, path in enumerate(args.models):
        model = load_model(path)
        if model is None:
            raise SystemExit(f"Model not found: {path}. Train it first: python -m rl.train")
        for p in profiles:
            base = {"profile_id": p.profile_id, "region": p.region, "traveller_type": p.traveller_type}
            rows.append({**base, "method": "rl", "seed": seed, **evaluate_one(p, cands[p.profile_id], "rl", model)})
    ab = load_model(args.ablation) if Path(args.ablation).exists() else None
    if ab is not None:
        for p in profiles:
            base = {"profile_id": p.profile_id, "region": p.region, "traveller_type": p.traveller_type}
            rows.append({**base, "method": "rl_no_crowd", "seed": 0,
                         **evaluate_one(p, cands_nc[p.profile_id], "rl", ab)})

    df = pd.DataFrame(rows)
    df.to_csv(OUT / "per_profile.csv", index=False)

    # average RL over seeds per profile so the paired test has one value per profile
    per = df.groupby(["method", "profile_id"])[METRICS].mean().reset_index()
    summary = per.groupby("method")[METRICS].agg(["mean", "std"]).round(3)
    summary.to_csv(OUT / "summary.csv")

    tests = []
    rl = per[per.method == "rl"].set_index("profile_id").sort_index()
    for other in [m for m in ("greedy", "nearest", "rl_no_crowd") if m in set(per.method)]:
        b = per[per.method == other].set_index("profile_id").sort_index()
        for metric in ("total_reward", "mean_preference", "total_travel_min", "crowd_suitability"):
            x, y = rl[metric].values, b[metric].values
            if np.allclose(x, y):
                tests.append({"comparison": f"rl vs {other}", "metric": metric, "W": None, "p": 1.0, "r": 0.0})
                continue
            res = wilcoxon(x, y, method="approx")
            r = abs(res.zstatistic) / np.sqrt(len(x))
            tests.append({"comparison": f"rl vs {other}", "metric": metric, "W": res.statistic,
                          "p": res.pvalue, "r": round(r, 3), "median_diff": float(np.median(x - y))})
    pd.DataFrame(tests).to_csv(OUT / "wilcoxon.csv", index=False)

    pd.set_option("display.width", 160)
    print(summary.xs("mean", axis=1, level=1))
    print(pd.DataFrame(tests).round(4).to_string(index=False))
    print(f"\nSaved results to {OUT}")


if __name__ == "__main__":
    main()
