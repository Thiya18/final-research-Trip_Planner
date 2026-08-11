"""The user profile: what the app sends, and what the simulated users contain."""
import math
from dataclasses import dataclass, field
from typing import List, Optional

from .config import BUDGET_BANDS, COSTS, REGION_HUB


@dataclass
class UserProfile:
    region: str
    interests: List[str]
    trip_days: int = 2
    daily_hours: int = 9
    group_size: int = 2
    budget_lkr_per_person_per_day: float = 20000
    traveller_type: str = "local"            # "local" | "international"
    crowd_preference: str = "moderate"       # peaceful | moderate | lively | no_preference
    transport_mode: str = "private_car"      # private_car | tuk_tuk | bus
    travel_month: int = 1
    interest_text: str = ""
    start_hub: Optional[str] = None
    profile_id: str = "app-user"
    extra: dict = field(default_factory=dict)

    def __post_init__(self):
        if isinstance(self.interests, str):
            self.interests = [x for x in self.interests.split(";") if x]
        self.trip_days = int(self.trip_days)
        self.daily_hours = int(self.daily_hours)
        self.group_size = max(1, int(self.group_size))
        self.travel_month = int(self.travel_month)
        if not self.start_hub:
            self.start_hub = REGION_HUB[self.region]

    # ---------- derived values ----------
    @property
    def total_budget(self) -> float:
        return self.budget_lkr_per_person_per_day * self.trip_days * self.group_size

    @property
    def budget_level(self) -> str:
        for limit, level in BUDGET_BANDS[self.traveller_type]:
            if self.budget_lkr_per_person_per_day < limit:
                return level
        return "high"

    @property
    def nights(self) -> int:
        return max(0, self.trip_days - 1)

    @property
    def rooms(self) -> int:
        return math.ceil(self.group_size / 2)

    @property
    def meals_cost(self) -> float:
        return COSTS["meals_per_person_per_day"][self.budget_level] * self.group_size * self.trip_days

    @property
    def accommodation_cost(self) -> float:
        return COSTS["accommodation_per_room_per_night"][self.budget_level] * self.rooms * self.nights

    @property
    def activity_budget(self) -> float:
        """Money left for entrance fees and transport after meals and rooms."""
        return max(0.0, self.total_budget - self.meals_cost - self.accommodation_cost)

    @classmethod
    def from_dict(cls, d: dict) -> "UserProfile":
        known = {k: d[k] for k in cls.__dataclass_fields__ if k in d and k != "extra"}
        return cls(**known)
