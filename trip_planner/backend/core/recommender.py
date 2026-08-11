"""Recommendation module (Sections 4.6.1-4.6.2): semantic matching + contextual filtering.

Semantic model: Sentence-BERT 'all-MiniLM-L6-v2' (downloaded automatically the first time).
If it cannot be loaded (no internet, or TRIP_EMBEDDER=tfidf), a TF-IDF matcher is used instead
so the app still works. The API reports which one is active (GET /health).
"""
import logging
import os
from functools import lru_cache

import numpy as np

from .budget import entrance_fee
from .config import (CROWD_FIT, INTEREST_KEYWORDS, MAX_FEE_SHARE, N_CANDIDATES,
                     OFF_SEASON_FACTOR, REC_CROWD_SHARE, REC_WEIGHTS)
from .data import get_data
from .profile import UserProfile

log = logging.getLogger(__name__)
SBERT_MODEL = os.getenv("TRIP_SBERT_MODEL", "all-MiniLM-L6-v2")
STRICT_SEASON_TAGS = {"whales", "night climb"}   # no point recommending these out of season


def dest_text(row) -> str:
    return f"{row['name']}. {row['category'].replace('_', ' ')}. {row['tags'].replace(';', ', ')}. {row['description']}"


def user_text(p: UserProfile) -> str:
    base = p.interest_text.strip()
    keywords = " ".join(INTEREST_KEYWORDS.get(i, i) for i in p.interests)
    return f"{base} I like {keywords}." if base else f"I like {keywords}."


class Embedder:
    def __init__(self, texts):
        self.kind = "tfidf"
        if os.getenv("TRIP_EMBEDDER", "sbert") != "tfidf":
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(SBERT_MODEL)
                self.kind = "sentence-bert"
            except Exception as e:  # no internet / not installed
                log.warning("Sentence-BERT unavailable (%s); using TF-IDF fallback", type(e).__name__)
        if self.kind == "tfidf":
            from sklearn.feature_extraction.text import TfidfVectorizer
            vocab_texts = list(texts) + list(INTEREST_KEYWORDS.values())
            self.model = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), sublinear_tf=True).fit(vocab_texts)
        self.matrix = self.encode(texts)

    def encode(self, texts):
        if self.kind == "sentence-bert":
            return np.asarray(self.model.encode(list(texts), normalize_embeddings=True))
        m = self.model.transform(list(texts)).toarray()
        n = np.linalg.norm(m, axis=1, keepdims=True)
        return m / np.where(n == 0, 1, n)


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    d = get_data().dest
    return Embedder([dest_text(r) for _, r in d.iterrows()])


def effective_crowd(row, month: int) -> int:
    return min(3, int(row.crowd_score) + (1 if month in row.peak_set else 0))


def crowd_fit(row, p: UserProfile) -> float:
    return CROWD_FIT[p.crowd_preference][effective_crowd(row, p.travel_month)]


def recommend(p: UserProfile, k: int = N_CANDIDATES, use_crowd: bool = True) -> list:
    """Ranked candidate list for one user. Each item carries the scores the planners use."""
    data, emb = get_data(), get_embedder()
    d = data.dest
    sims = emb.matrix @ emb.encode([user_text(p)])[0]
    sims = dict(zip(d.index, sims))

    region = d[d.region == p.region]
    lo, hi = min(sims[i] for i in region.index), max(sims[i] for i in region.index)
    out, removed = [], []
    for dest_id, row in region.iterrows():
        tags = set(row.tags.split(";"))
        in_season = (not row.best_set) or (p.travel_month in row.best_set)
        fee = entrance_fee(row, p)
        if not in_season and tags & STRICT_SEASON_TAGS:
            removed.append((row["name"], "out of season"))
            continue
        if p.activity_budget > 0 and fee > MAX_FEE_SHARE * p.activity_budget:
            removed.append((row["name"], "entrance fee too high for budget"))
            continue
        semantic = (sims[dest_id] - lo) / (hi - lo) if hi > lo else 0.5
        # tags that hit one of the user's interest keyword lists (also shown to the user as "why this place")
        matched_tags = sorted(w for w in tags if any(w in INTEREST_KEYWORDS.get(i, "") for i in p.interests))
        if row.category in p.interests:
            cat = 1.0
        elif matched_tags:
            cat = 0.5
        else:
            cat = 0.0
        pref = REC_WEIGHTS["semantic"] * semantic + REC_WEIGHTS["category"] * cat
        if not in_season:
            pref *= OFF_SEASON_FACTOR
        cfit = crowd_fit(row, p)
        score = (1 - REC_CROWD_SHARE) * pref + REC_CROWD_SHARE * cfit if use_crowd else pref
        out.append({
            "dest_id": dest_id, "name": row["name"], "category": row.category,
            "description": row.description, "latitude": float(row.latitude), "longitude": float(row.longitude),
            "visit_min": int(row.visit_duration_min), "fee_lkr": round(fee),
            "crowd_level": ["Low", "Medium", "High"][effective_crowd(row, p.travel_month) - 1],
            "crowd_fit": cfit if use_crowd else 1.0, "crowd_fit_true": cfit, "pref": round(float(pref), 4),
            "score": round(float(score), 4), "in_season": in_season,
            "semantic": round(float(semantic), 4), "category_match": cat, "matched_tags": matched_tags,
            "open_time": row.open_time, "close_time": row.close_time,
        })
    out.sort(key=lambda x: x["score"], reverse=True)
    return out[:k]


def embedder_kind() -> str:
    return get_embedder().kind
