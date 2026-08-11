"""Gymnasium environment for RL itinerary sequencing (Section 4.6.3, a Markov decision process).

State  : per candidate [preference, crowd fit, visited, drive hours, visit hours, cost share, feasible]
         + [time left today, days left, budget left, day index, trip length]
Action : 0..K-1 = visit that candidate, K = end the day   (invalid actions are masked)
Reward : w_pref*pref + w_crowd*crowd_fit - w_travel*drive_hours - w_cost*cost_share, + completion bonus
"""
import gymnasium as gym
import numpy as np
from gymnasium import spaces

from .config import MAX_TRIP_DAYS, N_CANDIDATES, REWARD
from .profile import UserProfile
from .recommender import recommend
from .simulator import TripSimulator

K = N_CANDIDATES
PER_CAND = 7
N_GLOBAL = 5
OBS_SIZE = K * PER_CAND + N_GLOBAL


def observe(sim: TripSimulator) -> np.ndarray:
    obs = np.zeros(OBS_SIZE, dtype=np.float32)
    for j in range(sim.K):
        c = sim.c[j]
        km, mins = sim.leg(j)
        cost_share = sim.cost_of(j) / max(sim.budget_left, 1.0)
        obs[j * PER_CAND:(j + 1) * PER_CAND] = [
            c["pref"], c["crowd_fit"], float(j in sim.visited), min(mins / 300, 1.0),
            c["visit_min"] / 300, min(cost_share, 2.0) / 2, float(sim.feasible(j)),
        ]
    p = sim.p
    obs[K * PER_CAND:] = [
        sim.minutes_left / max(sim.day_minutes, 1), (p.trip_days - sim.day) / MAX_TRIP_DAYS,
        sim.budget_left / max(p.activity_budget, 1.0), sim.day / MAX_TRIP_DAYS, p.trip_days / MAX_TRIP_DAYS,
    ]
    return obs


def full_mask(sim: TripSimulator) -> np.ndarray:
    """Mask padded to K+1 actions (some regions/filters give fewer than K candidates)."""
    m = np.zeros(K + 1, dtype=bool)
    small = sim.action_mask()
    m[:sim.K] = small[:sim.K]
    m[K] = small[-1]
    return m


def to_sim_action(a: int, sim: TripSimulator) -> int:
    return sim.END_DAY if a == K else int(a)


class TripEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(self, profiles: list, reward=REWARD, use_crowd=True, seed=None):
        super().__init__()
        self.reward_w, self.use_crowd = reward, use_crowd
        self.items = []
        for row in profiles:                       # pre-compute recommendations once (fast training)
            p = row if isinstance(row, UserProfile) else UserProfile.from_dict(row)
            self.items.append((p, recommend(p, use_crowd=use_crowd)))
        self.observation_space = spaces.Box(0.0, 1.0, shape=(OBS_SIZE,), dtype=np.float32)
        self.action_space = spaces.Discrete(K + 1)
        self.rng = np.random.default_rng(seed)
        self.sim = None

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if seed is not None:
            self.rng = np.random.default_rng(seed)
        idx = (options or {}).get("index", int(self.rng.integers(len(self.items))))
        p, cands = self.items[idx]
        self.sim = TripSimulator(p, cands, self.reward_w)
        return observe(self.sim), {}

    def step(self, action):
        r = self.sim.step(to_sim_action(int(action), self.sim))
        return observe(self.sim), float(r), self.sim.done, False, {}

    def action_masks(self) -> np.ndarray:      # used by sb3-contrib MaskablePPO
        return full_mask(self.sim)
