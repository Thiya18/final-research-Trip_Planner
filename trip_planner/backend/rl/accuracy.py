"""Accuracy evaluation on the 60 test profiles.

A destination counts as RELEVANT (correct) for a user if its category is one of the user's interests,
or one of its tags is a keyword of those interests (config.INTEREST_KEYWORDS). This is the ground truth
the user stated, so every recommendation and every itinerary stop can be marked correct / incorrect.

Run from the backend folder:
    python -m rl.accuracy
    python -m rl.accuracy --models models/rl_maskable_ppo.zip models/seed1.zip ...

Outputs (backend/results/):
    accuracy_recommender.csv   per profile: Hit@1, P@5/10/15, R@5, NDCG@5 for full recommender, SBERT-only, random
    accuracy_itinerary.csv     per profile x method: interest / crowd / constraint accuracy, P@5/R@5/NDCG@5 of first 5 stops
    accuracy_summary.csv       mean accuracy (%) per ranker and per method
    accuracy_wilcoxon.csv      full recommender vs random, SBERT-only vs random (paired, P@10)
"""
import argparse

import numpy as np
import pandas as pd
from scipy.stats import wilcoxon

from core.budget import estimate
from core.config import BACKEND_DIR, DATA_DIR, INTEREST_KEYWORDS, RL_MODEL_PATH
from core.data import get_data
from core.planner import run_method
from core.profile import UserProfile
from core.recommender import get_embedder, recommend, user_text
from core.rl_policy import load_model

OUT = BACKEND_DIR / "results"
KS = (5, 10, 15)
N_RANDOM = 200          # random rankings averaged per profile
GOOD_CROWD_FIT = 0.7    # same threshold as crowd_suitability in planner.metrics


def is_relevant(row, p: UserProfile) -> bool:
    if row.category in p.interests:
        return True
    keywords = {w for i in p.interests for w in INTEREST_KEYWORDS.get(i, "").split()}
    return bool(set(row.tags.split(";")) & keywords)


def ranking_scores(ranked_rel, n_relevant=None):
    """ranked_rel: list of 0/1 relevance in ranked order -> Hit@1, Precision@k, Recall@5 and NDCG@5.
    n_relevant: relevant places available to the user (defaults to the relevant ones in ranked_rel)."""
    n_rel = sum(ranked_rel) if n_relevant is None else n_relevant
    out = {"hit@1": float(ranked_rel[0]) if ranked_rel else 0.0}
    for k in KS:
        top = ranked_rel[:k]
        out[f"p@{k}"] = sum(top) / len(top) if top else 0.0
    top5 = ranked_rel[:5]
    out["r@5"] = sum(top5) / n_rel if n_rel else 0.0
    dcg = sum(r / np.log2(i + 2) for i, r in enumerate(top5))
    idcg = sum(1 / np.log2(i + 2) for i in range(min(5, n_rel)))
    out["ndcg@5"] = dcg / idcg if idcg else 0.0
    return out


def recommender_rows(profiles, rng):
    data, emb = get_data(), get_embedder()
    d = data.dest
    rows = []
    for p in profiles:
        eligible = recommend(p, k=10_000)                    # every place left after the context filters
        rel = {c["dest_id"]: int(is_relevant(d.loc[c["dest_id"]], p)) for c in eligible}
        sims = dict(zip(d.index, emb.matrix @ emb.encode([user_text(p)])[0]))
        full = [rel[c["dest_id"]] for c in eligible]                                  # already ranked by score
        sbert = [rel[i] for i in sorted(rel, key=lambda i: sims[i], reverse=True)]    # text similarity only
        rand = [ranking_scores(list(rng.permutation(full))) for _ in range(N_RANDOM)]
        base = {"profile_id": p.profile_id, "region": p.region, "n_eligible": len(full),
                "n_relevant": sum(full)}
        rows.append({**base, "ranker": "full_recommender", **ranking_scores(full)})
        rows.append({**base, "ranker": "sbert_only", **ranking_scores(sbert)})
        rows.append({**base, "ranker": "random", **pd.DataFrame(rand).mean().to_dict()})
    return pd.DataFrame(rows)


def itinerary_metrics(sim, p, n_relevant):
    """n_relevant: relevant places the recommender could offer; the first five stops are scored as a ranked list."""
    d = get_data().dest
    stops = [s for day in sim.itinerary() for s in day["stops"]]
    within_time = all(sum(s["travel_min"] + s["visit_min"] for s in day["stops"]) <= p.daily_hours * 60
                      for day in sim.itinerary())
    within_budget = bool(estimate(sim.itinerary(), p)["within_budget"])
    n = len(stops)
    first5 = ranking_scores([int(is_relevant(d.loc[s["dest_id"]], p)) for s in stops], n_relevant)
    return {
        "n_stops": n,
        "interest_accuracy": sum(is_relevant(d.loc[s["dest_id"]], p) for s in stops) / n if n else np.nan,
        "crowd_accuracy": sum(s["crowd_fit"] >= GOOD_CROWD_FIT for s in stops) / n if n else np.nan,
        "constraint_accuracy": float(within_time and within_budget),
        "stops_p@5": first5["p@5"], "stops_r@5": first5["r@5"], "stops_ndcg@5": first5["ndcg@5"],
    }


def itinerary_rows(profiles, models):
    rows = []
    for p in profiles:
        cands = recommend(p)
        d = get_data().dest
        n_rel = sum(is_relevant(d.loc[c["dest_id"]], p) for c in recommend(p, k=10_000))
        base = {"profile_id": p.profile_id, "region": p.region}
        for method in ("greedy", "nearest"):
            rows.append({**base, "method": method, "seed": 0, **itinerary_metrics(run_method(p, cands, method), p, n_rel)})
        for seed, model in enumerate(models):
            rows.append({**base, "method": "rl", "seed": seed,
                         **itinerary_metrics(run_method(p, cands, "rl", model=model), p, n_rel)})
    return pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="*", default=[str(RL_MODEL_PATH)])
    ap.add_argument("--seed", type=int, default=0, help="seed for the random-ranking baseline")
    args = ap.parse_args()
    OUT.mkdir(exist_ok=True)

    profiles = [UserProfile.from_dict(r) for r in pd.read_csv(DATA_DIR / "profiles_test.csv").to_dict("records")]
    models = []
    for path in args.models:
        m = load_model(path)
        if m is None:
            raise SystemExit(f"Model not found: {path}. Train it first: python -m rl.train")
        models.append(m)

    rec = recommender_rows(profiles, np.random.default_rng(args.seed))
    rec.to_csv(OUT / "accuracy_recommender.csv", index=False)
    itin = itinerary_rows(profiles, models)
    itin.to_csv(OUT / "accuracy_itinerary.csv", index=False)

    rec_cols = ["hit@1"] + [f"p@{k}" for k in KS] + ["r@5", "ndcg@5"]
    itin_cols = ["interest_accuracy", "crowd_accuracy", "constraint_accuracy", "stops_p@5", "stops_r@5",
                 "stops_ndcg@5"]
    rec_sum = (rec.groupby("ranker")[rec_cols].mean() * 100).round(1)
    per = itin.groupby(["method", "profile_id"])[itin_cols].mean().reset_index()   # average RL seeds
    itin_sum = (per.groupby("method")[itin_cols].mean() * 100).round(1)
    summary = pd.concat([rec_sum.rename(index=lambda i: f"recommender:{i}"),
                         itin_sum.rename(index=lambda i: f"itinerary:{i}")])
    summary.to_csv(OUT / "accuracy_summary.csv")

    tests = []
    rnd = rec[rec.ranker == "random"].set_index("profile_id").sort_index()["p@10"]
    for ranker in ("full_recommender", "sbert_only"):
        x = rec[rec.ranker == ranker].set_index("profile_id").sort_index()["p@10"]
        res = wilcoxon(x.values, rnd.values, method="approx")
        tests.append({"comparison": f"{ranker} vs random", "metric": "p@10", "W": res.statistic, "p": res.pvalue,
                      "r": round(abs(res.zstatistic) / np.sqrt(len(x)), 3),
                      "median_diff": float(np.median(x.values - rnd.values))})
    pd.DataFrame(tests).to_csv(OUT / "accuracy_wilcoxon.csv", index=False)

    pd.set_option("display.width", 160)
    print("Accuracy (%)\n", summary.to_string())
    print("\n", pd.DataFrame(tests).round(4).to_string(index=False))
    print(f"\nSaved results to {OUT}")


if __name__ == "__main__":
    main()
