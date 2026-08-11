"""Trip simulator: the shared 'world' used by the RL environment, both baselines and evaluation.

The traveller starts at the region hub. Each day has `daily_hours` from 08:00. Choosing a place adds
drive time + visit time and spends entrance fee + transport. 'End day' moves to the next morning at the
same place (the traveller stays nearby overnight). The trip ends after the last day.
"""
from .budget import transport_cost
from .config import DAY_START_HOUR, REWARD
from .data import get_data
from .profile import UserProfile


def clock(minutes_from_start: float) -> str:
    t = int(round(DAY_START_HOUR * 60 + minutes_from_start))
    return f"{t // 60:02d}:{t % 60:02d}"


class TripSimulator:
    def __init__(self, profile: UserProfile, candidates: list, reward=REWARD):
        self.p, self.c, self.w = profile, candidates, reward
        self.data = get_data()
        self.K = len(candidates)
        self.END_DAY = self.K            # action index meaning "end the day"
        self.reset()

    def reset(self):
        self.current = self.p.start_hub
        self.day = 0
        self.day_minutes = self.p.daily_hours * 60
        self.minutes_left = self.day_minutes
        self.budget_left = self.p.activity_budget
        self.visited = set()
        self.days = [{"day": 1, "stops": []}]
        self.total_reward = 0.0
        self.done = False

    # ---------- helpers ----------
    def leg(self, j):
        return self.data.travel(self.current, self.c[j]["dest_id"])

    def cost_of(self, j):
        km, _ = self.leg(j)
        return self.c[j]["fee_lkr"] + transport_cost(km, self.p)

    def feasible(self, j) -> bool:
        if j in self.visited:
            return False
        km, mins = self.leg(j)
        return (mins + self.c[j]["visit_min"] <= self.minutes_left) and (self.cost_of(j) <= self.budget_left)

    def action_mask(self):
        m = [self.feasible(j) for j in range(self.K)]
        return m + [not self.done]

    def any_feasible(self) -> bool:
        return any(self.feasible(j) for j in range(self.K))

    # ---------- transition ----------
    def step(self, a: int) -> float:
        if self.done:
            return 0.0
        if a == self.END_DAY:
            r = self._end_day()
        else:
            if not self.feasible(a):          # only reachable without masking
                self.total_reward -= 1.0
                return -1.0
            r = self._visit(a)
        if not self.done and len(self.visited) == self.K:
            r += self._finish()
        self.total_reward += r
        return r

    def _visit(self, j) -> float:
        cand = self.c[j]
        km, mins = self.leg(j)
        cost = self.cost_of(j)
        used = self.day_minutes - self.minutes_left
        self.days[-1]["stops"].append({
            **{k: cand[k] for k in ("dest_id", "name", "category", "latitude", "longitude", "visit_min",
                                    "fee_lkr", "crowd_level", "pref")},
            "crowd_fit": cand["crowd_fit_true"],
            "leg_km": round(km, 1), "travel_min": round(mins),
            "arrive": clock(used + mins), "leave": clock(used + mins + cand["visit_min"]),
            "from": self.data.name(self.current),
        })
        self.minutes_left -= mins + cand["visit_min"]
        self.budget_left -= cost
        self.visited.add(j)
        self.current = cand["dest_id"]
        share = cost / self.p.activity_budget if self.p.activity_budget > 0 else 1.0
        return (self.w["w_pref"] * cand["pref"] + self.w["w_crowd"] * cand["crowd_fit"]
                - self.w["w_travel"] * mins / 60 - self.w["w_cost"] * share)

    def _end_day(self) -> float:
        self.day += 1
        if self.day >= self.p.trip_days:
            return self._finish()
        self.minutes_left = self.day_minutes
        self.days.append({"day": self.day + 1, "stops": []})
        return 0.0

    def _finish(self) -> float:
        self.done = True
        days_used = sum(1 for d in self.days if d["stops"])
        return self.w["completion_bonus"] * days_used / self.p.trip_days

    def itinerary(self):
        days = [d for d in self.days]
        while len(days) < self.p.trip_days:          # free days if nothing left to visit
            days.append({"day": len(days) + 1, "stops": []})
        return days
