"""Analyse the post-use questionnaire (T1-T7, 1 = strongly disagree ... 5 = strongly agree) for Chapter 5.

    python evaluation/user_study.py evaluation/user_study_responses.csv

Outputs (evaluation/test_results/ and evaluation/figures/):
    user_study_items.csv   per item: n, mean, SD, median, % agree (4-5), % disagree (1-2),
                           one-sample Wilcoxon vs neutral (3), international vs local Mann-Whitney U
    user_study_extra.csv   Cronbach's alpha (T1-T7) and Spearman rho of T1-T6 with overall satisfaction T7
    fig5_5_user_study.png  diverging stacked bar of the answer distribution per item
"""
import sys
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats

HERE = Path(__file__).resolve().parent
ITEMS = {
    "t1": "T1 Recommended places matched my interests",
    "t2": "T2 The plan felt personalised to me",
    "t3": "T3 The day-by-day itinerary was useful",
    "t4": "T4 The route and timing were practical",
    "t5": "T5 The budget estimate was useful",
    "t6": "T6 The crowd information was useful",
    "t7": "T7 Overall, I am satisfied with the trip plan",
}
LEVELS = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"]
COLORS = ["#e34948", "#f2a3a2", "#d6d5d0", "#8fbbee", "#2a78d6"]   # diverging red <-> blue, gray midpoint


def cronbach_alpha(items: pd.DataFrame) -> float:
    k = items.shape[1]
    return k / (k - 1) * (1 - items.var(ddof=1).sum() / items.sum(axis=1).var(ddof=1))


def item_table(df):
    rows = []
    for col, label in ITEMS.items():
        x = df[col]
        w = stats.wilcoxon(x - 3, method="approx")
        intl, loc = df.loc[df.group == "international", col], df.loc[df.group == "local", col]
        mw = stats.mannwhitneyu(intl, loc, alternative="two-sided")
        rows.append({
            "item": label, "n": len(x), "mean": round(x.mean(), 2), "sd": round(x.std(ddof=1), 2),
            "median": x.median(), "agree_pct": round((x >= 4).mean() * 100, 1),
            "disagree_pct": round((x <= 2).mean() * 100, 1),
            "wilcoxon_vs_3_p": w.pvalue, "wilcoxon_r": round(abs(w.zstatistic) / np.sqrt(len(x)), 3),
            "mean_international": round(intl.mean(), 2), "mean_local": round(loc.mean(), 2),
            "mannwhitney_U": mw.statistic, "mannwhitney_p": round(mw.pvalue, 4),
        })
    return pd.DataFrame(rows)


def figure(df, path):
    counts = np.array([[(df[c] == v).sum() for v in range(1, 6)] for c in ITEMS]) / len(df) * 100
    left = -(counts[:, 0] + counts[:, 1] + counts[:, 2] / 2)       # centre the neutral segment on 0
    fig, ax = plt.subplots(figsize=(9, 4.2), dpi=200)
    y = np.arange(len(ITEMS))[::-1]
    for j in range(5):
        ax.barh(y, counts[:, j], left=left, color=COLORS[j], height=0.6, label=LEVELS[j],
                edgecolor="white", linewidth=1.5)
        for yi, l, w in zip(y, left, counts[:, j]):
            if w >= 10:
                ax.text(l + w / 2, yi, f"{w:.0f}%", ha="center", va="center", fontsize=7,
                        color="white" if j in (0, 4) else "#0b0b0b")
        left = left + counts[:, j]
    ax.axvline(0, color="#52514e", linewidth=0.8, zorder=0)
    ax.set_yticks(y, list(ITEMS.values()), fontsize=8)
    ax.set_xlim(-30, 100)
    ax.set_xticks(range(-20, 101, 20), [f"{abs(t)}%" for t in range(-20, 101, 20)], fontsize=7)
    ax.set_xlabel("Share of participants (n = %d)" % len(df), fontsize=8, color="#52514e")
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color("#c3c2b7")
    ax.tick_params(axis="y", length=0)
    ax.legend(ncol=5, fontsize=7, frameon=False, loc="upper center", bbox_to_anchor=(0.4, -0.15))
    fig.tight_layout()
    fig.savefig(path, facecolor="white")


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "user_study_responses.csv"
    df = pd.read_csv(src)
    out = HERE / "test_results"
    out.mkdir(exist_ok=True)

    table = item_table(df)
    table.to_csv(out / "user_study_items.csv", index=False)
    alpha = cronbach_alpha(df[list(ITEMS)])
    extra = [{"measure": "cronbach_alpha_T1_T7", "value": round(alpha, 3), "p": None}]
    for col in list(ITEMS)[:-1]:
        rho, p = stats.spearmanr(df[col], df["t7"])
        extra.append({"measure": f"spearman_{col}_vs_t7", "value": round(rho, 3), "p": p})
    pd.DataFrame(extra).to_csv(out / "user_study_extra.csv", index=False)
    figure(df, HERE / "figures" / "fig5_5_user_study.png")

    pd.set_option("display.width", 200)
    print(table.drop(columns=["mannwhitney_U"]).to_string(index=False))
    print()
    print(pd.DataFrame(extra).to_string(index=False))
    per_person = df[list(ITEMS)].mean(axis=1)
    print(f"\nOverall mean of all items: {per_person.mean():.2f} (SD {per_person.std(ddof=1):.2f}), "
          f"international {per_person[df.group == 'international'].mean():.2f}, "
          f"local {per_person[df.group == 'local'].mean():.2f}")


if __name__ == "__main__":
    main()
