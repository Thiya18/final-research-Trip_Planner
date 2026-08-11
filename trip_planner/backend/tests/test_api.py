"""Run with:  pytest -q   (from the backend folder)"""
import os

os.environ.setdefault("TRIP_EMBEDDER", "tfidf")          # fast tests without downloading the model
import tempfile  # noqa: E402

os.environ["DATABASE_URL"] = f"sqlite:///{tempfile.mkdtemp()}/test.db"   # throw-away DB for tests

from fastapi.testclient import TestClient  # noqa: E402

from api.main import app  # noqa: E402

client = TestClient(app)
BODY = {"region": "Southern Coast", "interests": ["beach", "nature_wildlife"], "trip_days": 2,
        "group_size": 2, "budget_lkr_per_person_per_day": 20000, "traveller_type": "local",
        "crowd_preference": "peaceful", "travel_month": 1}


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["destinations"] > 0


def test_recommend_region_only():
    r = client.post("/recommend", json=BODY)
    assert r.status_code == 200
    recs = r.json()
    assert 0 < len(recs) <= 15
    in_region = {d["dest_id"] for d in client.get("/destinations", params={"region": BODY["region"]}).json()}
    assert all(rec["dest_id"] in in_region for rec in recs)      # nothing from another region


def test_plan_all_methods_respect_time():
    for m in ("greedy", "nearest", "rl"):
        r = client.post("/plan", json={**BODY, "method": m})
        assert r.status_code == 200, r.text
        res = r.json()
        assert len(res["itinerary"]) == BODY["trip_days"]
        for day in res["itinerary"]:
            if day["stops"]:
                assert day["stops"][-1]["leave"] <= "17:00"   # 9 hours from 08:00
        assert res["response_ms"] < 5000


def test_comfort_budget_produces_feasible_itinerary():
    profile = {**BODY, "interests": ["beach", "cultural"], "trip_days": 3,
               "budget_lkr_per_person_per_day": 30000, "travel_month": 10}
    response = client.post("/plan", json={**profile, "method": "rl"})
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["metrics"]["n_stops"] > 0
    assert result["budget"]["within_budget"] is True


def test_feedback_roundtrip():
    plan_id = client.post("/plan", json={**BODY, "method": "greedy"}).json()["plan_id"]
    r = client.post("/feedback", json={"plan_id": plan_id, "overall": 5, "relevance": 4})
    assert r.status_code == 200
    assert client.post("/feedback", json={"plan_id": "nope", "overall": 3}).status_code == 404


def test_bad_interest_rejected():
    assert client.post("/plan", json={**BODY, "interests": ["shopping"]}).status_code == 422
