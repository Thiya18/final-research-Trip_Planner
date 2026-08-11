"""REST API for the mobile app.

Run:  uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload     (from the backend folder)
Docs: http://localhost:8000/docs  (try every endpoint in the browser)
"""
import json
import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Column, DateTime, Float, Integer, MetaData, String, Table, Text, create_engine, insert, select

from core.config import DATABASE_URL, INTEREST_KEYWORDS, MAX_TRIP_DAYS, REGION_HUB
from core.data import get_data
from core.planner import METHODS, plan
from core.profile import UserProfile
from core.recommender import embedder_kind, recommend
from core.rl_policy import rl_available

app = FastAPI(title="Sri Lanka Trip Planner API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ---------------------------------------------------------------- storage (SQLite by default, PostgreSQL via DATABASE_URL)
engine = create_engine(DATABASE_URL, future=True)
meta = MetaData()
plans_t = Table("itineraries", meta,
                Column("plan_id", String(36), primary_key=True), Column("created_at", DateTime),
                Column("method", String(16)), Column("profile_json", Text), Column("result_json", Text),
                Column("response_ms", Integer))
feedback_t = Table("feedback", meta,
                   Column("id", Integer, primary_key=True, autoincrement=True), Column("plan_id", String(36)),
                   Column("created_at", DateTime), Column("overall", Integer), Column("relevance", Integer),
                   Column("route", Integer), Column("budget", Integer), Column("crowd", Integer),
                   Column("comment", Text), Column("traveller_type", String(16)), Column("score_avg", Float))
meta.create_all(engine)


# ---------------------------------------------------------------- request models
class ProfileIn(BaseModel):
    region: Literal["Cultural Triangle", "Hill Country", "Southern Coast"]
    interests: List[str] = Field(..., min_length=1, examples=[["cultural", "nature_wildlife"]])
    interest_text: str = ""
    trip_days: int = Field(2, ge=1, le=MAX_TRIP_DAYS)
    daily_hours: int = Field(9, ge=4, le=14)
    group_size: int = Field(2, ge=1, le=20)
    budget_lkr_per_person_per_day: float = Field(20000, ge=1000)
    traveller_type: Literal["local", "international"] = "local"
    crowd_preference: Literal["peaceful", "moderate", "lively", "no_preference"] = "moderate"
    transport_mode: Literal["private_car", "tuk_tuk", "bus"] = "private_car"
    travel_month: int = Field(1, ge=1, le=12)


class PlanIn(ProfileIn):
    method: Literal["rl", "greedy", "nearest"] = "rl"


class FeedbackIn(BaseModel):
    plan_id: str
    overall: int = Field(..., ge=1, le=5)
    relevance: Optional[int] = Field(None, ge=1, le=5)
    route: Optional[int] = Field(None, ge=1, le=5)
    budget: Optional[int] = Field(None, ge=1, le=5)
    crowd: Optional[int] = Field(None, ge=1, le=5)
    comment: str = ""


def to_profile(body: ProfileIn) -> UserProfile:
    bad = [i for i in body.interests if i not in INTEREST_KEYWORDS]
    if bad:
        raise HTTPException(422, f"Unknown interests: {bad}. Use {list(INTEREST_KEYWORDS)}")
    return UserProfile.from_dict(body.model_dump(exclude={"method"}))


# ---------------------------------------------------------------- endpoints
@app.get("/health")
def health():
    return {"status": "ok", "embedder": embedder_kind(), "rl_model_loaded": rl_available(),
            "destinations": int(len(get_data().dest))}


@app.get("/meta")
def meta_info():
    return {"regions": list(REGION_HUB), "interests": list(INTEREST_KEYWORDS), "methods": list(METHODS),
            "crowd_preferences": ["peaceful", "moderate", "lively", "no_preference"],
            "transport_modes": ["private_car", "tuk_tuk", "bus"], "max_trip_days": MAX_TRIP_DAYS}


@app.get("/destinations")
def destinations(region: Optional[str] = None):
    d = get_data().dest
    if region:
        d = d[d.region == region]
    cols = ["dest_id", "name", "region", "category", "tags", "description", "latitude", "longitude",
            "visit_duration_min", "fee_foreign_usd", "fee_local_lkr", "crowd_level", "best_months"]
    return d[cols].to_dict(orient="records")


@app.post("/recommend")
def recommend_endpoint(body: ProfileIn):
    return recommend(to_profile(body))


@app.post("/plan")
def plan_endpoint(body: PlanIn):
    p = to_profile(body)
    result = plan(p, body.method)
    result["plan_id"] = str(uuid.uuid4())
    with engine.begin() as con:
        con.execute(insert(plans_t).values(
            plan_id=result["plan_id"], created_at=datetime.now(timezone.utc), method=result["method"],
            profile_json=body.model_dump_json(), result_json=json.dumps(result, default=str),
            response_ms=result["response_ms"]))
    return result


@app.post("/feedback")
def feedback_endpoint(body: FeedbackIn):
    with engine.begin() as con:
        row = con.execute(select(plans_t.c.profile_json).where(plans_t.c.plan_id == body.plan_id)).first()
        if row is None:
            raise HTTPException(404, "plan_id not found")
        scores = [s for s in (body.overall, body.relevance, body.route, body.budget, body.crowd) if s]
        con.execute(insert(feedback_t).values(
            plan_id=body.plan_id, created_at=datetime.now(timezone.utc), overall=body.overall,
            relevance=body.relevance, route=body.route, budget=body.budget, crowd=body.crowd,
            comment=body.comment, traveller_type=json.loads(row[0])["traveller_type"],
            score_avg=sum(scores) / len(scores)))
    return {"status": "saved"}
