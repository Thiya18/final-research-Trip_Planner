"""Central settings. Change numbers here, not inside the modules."""
import json
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.getenv("TRIP_DATA_DIR", BACKEND_DIR.parent / "data"))
MODEL_DIR = BACKEND_DIR / "models"
RL_MODEL_PATH = MODEL_DIR / "rl_maskable_ppo.zip"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'trip_planner.db'}")

COSTS = json.loads((DATA_DIR / "cost_reference.json").read_text())

# Number of recommended destinations handed to the itinerary engine (the RL action space).
N_CANDIDATES = 15
DAY_START_HOUR = 8
MAX_TRIP_DAYS = 7

# Reward weights (Section 4.6.3). Tune on profiles_val.csv only.
REWARD = {
    "w_pref": 1.0,        # preference match of the chosen place (0-1)
    "w_crowd": 0.5,       # crowd fit (0-1)
    "w_travel": 0.3,      # per hour of driving
    "w_cost": 0.3,        # cost as share of the activity budget
    "completion_bonus": 1.0,
}

# Scoring of recommendations
REC_WEIGHTS = {"semantic": 0.6, "category": 0.4}   # preference score
REC_CROWD_SHARE = 0.2                              # how much crowd fit moves the ranking
OFF_SEASON_FACTOR = 0.85
MAX_FEE_SHARE = 0.4      # one entrance fee may use at most 40% of the activity budget

REGION_HUB = {"Cultural Triangle": "H01", "Hill Country": "H02", "Southern Coast": "H03"}

INTEREST_KEYWORDS = {
    "beach": "beach beaches sea ocean swimming snorkelling sunset coast surfing",
    "cultural": "cultural heritage history ancient ruins unesco architecture colonial fortress museum",
    "nature_wildlife": "nature wildlife safari elephants leopards birds waterfall forest gardens lake whales",
    "adventure": "adventure hiking trekking climbing surfing views challenging",
    "religious": "religious temple buddhist hindu pilgrimage sacred stupa shrine",
    "food_dining": "food dining tea cooking spices tasting curry village",
}

# Crowd fit table: preference -> effective crowd level (1 Low, 2 Medium, 3 High) -> fit 0..1
CROWD_FIT = {
    "peaceful": {1: 1.0, 2: 0.5, 3: 0.0},
    "moderate": {1: 0.7, 2: 1.0, 3: 0.4},
    "lively": {1: 0.3, 2: 0.7, 3: 1.0},
    "no_preference": {1: 1.0, 2: 1.0, 3: 1.0},
}

# Budget level from budget per person per day (LKR), per traveller type (same bands as the survey sim).
BUDGET_BANDS = {
    "local": [(10000, "low"), (40000, "medium"), (float("inf"), "high")],
    "international": [(30000, "low"), (60000, "medium"), (float("inf"), "high")],
}
