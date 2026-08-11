"""Score System Usability Scale (SUS) responses for Section 5.8 (Table 5.8).

Fill sus_responses.csv with REAL participant answers (one row per participant), then run:
    python evaluation/sus_score.py evaluation/sus_responses.csv

Columns:
    participant_id   any id (no names)
    group            international | local
    q1 .. q10        SUS answers, 1 = strongly disagree ... 5 = strongly agree
    task_completed   1 if the participant created a plan without help, else 0
    plan_time_s      seconds from "Start planning" to the itinerary screen

Scoring (Brooke, 1996): odd items contribute (answer - 1), even items (5 - answer); sum x 2.5 -> 0..100.
"""
import sys

import numpy as np
import pandas as pd
from scipy import stats

ITEMS = [f"q{i}" for i in range(1, 11)]


def sus(row):
    odd = sum(row[f"q{i}"] - 1 for i in (1, 3, 5, 7, 9))
    even = sum(5 - row[f"q{i}"] for i in (2, 4, 6, 8, 10))
    return (odd + even) * 2.5


def ci95(x):
    if len(x) < 2:
        return (np.nan, np.nan)
    h = stats.t.ppf(0.975, len(x) - 1) * x.std(ddof=1) / np.sqrt(len(x))
    return (x.mean() - h, x.mean() + h)


def cronbach_alpha(items):
    # recode so every item points the same way (higher = more usable)
    rec = items.copy()
    for i in (2, 4, 6, 8, 10):
        rec[f"q{i}"] = 6 - rec[f"q{i}"]
    k = rec.shape[1]
    return k / (k - 1) * (1 - rec.var(ddof=1).sum() / rec.sum(axis=1).var(ddof=1))


def grade(score):
    # adjective scale (Bangor et al., 2009); 68 is the conventional average
    for limit, label in ((85.5, "Excellent"), (72.6, "Good"), (52.0, "OK"), (38.0, "Poor")):
        if score >= limit:
            return label
    return "Awful"


def main(path):
    df = pd.read_csv(path)
    bad = df[ITEMS].isna().any(axis=1) | ~df[ITEMS].isin([1, 2, 3, 4, 5]).all(axis=1)
    if bad.any():
        sys.exit(f"Rows with missing or out-of-range answers: {df.loc[bad, 'participant_id'].tolist()}")
    df["sus"] = df.apply(sus, axis=1)

    rows = []
    for name, g in [("International", df[df.group == "international"]), ("Local", df[df.group == "local"]),
                    ("All", df)]:
        lo, hi = ci95(g.sus)
        rows.append({"group": name, "n": len(g), "sus_mean": g.sus.mean(), "sus_sd": g.sus.std(ddof=1),
                     "sus_min": g.sus.min(), "sus_max": g.sus.max(), "ci95_low": lo, "ci95_high": hi,
                     "task_completion_%": 100 * g.task_completed.mean() if "task_completed" in g else np.nan,
                     "plan_time_s_mean": g.plan_time_s.mean() if "plan_time_s" in g else np.nan})
    out = pd.DataFrame(rows).round(1)
    print(out.to_string(index=False))

    all_mean = df.sus.mean()
    t = stats.ttest_1samp(df.sus, 68)
    print(f"\nOverall SUS {all_mean:.1f} ({grade(all_mean)}); vs benchmark 68: t = {t.statistic:.2f}, p = {t.pvalue:.4f}")
    intl, local = df[df.group == "international"].sus, df[df.group == "local"].sus
    if len(intl) and len(local):
        u = stats.mannwhitneyu(intl, local, alternative="two-sided")
        print(f"International vs local (Mann-Whitney): U = {u.statistic:.1f}, p = {u.pvalue:.4f}")
    if len(df) > 2:
        print(f"Cronbach's alpha (10 items): {cronbach_alpha(df[ITEMS]):.3f}")
    df.to_csv(path.replace(".csv", "_scored.csv"), index=False)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "evaluation/sus_responses.csv")
