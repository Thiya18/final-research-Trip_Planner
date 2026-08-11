"""Loads the CSV data once and offers fast lookups."""
from functools import lru_cache

import pandas as pd

from .config import DATA_DIR

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def parse_months(text) -> set:
    """'Jan-Apr;Jul-Aug' -> {1,2,3,4,7,8}. Handles wrap-around ('Nov-Feb') and '-' (none)."""
    out = set()
    if not isinstance(text, str) or text.strip() in ("", "-"):
        return out
    for part in text.split(";"):
        part = part.strip()
        if "-" in part:
            a, b = (MONTHS.index(p.strip()[:3]) + 1 for p in part.split("-"))
            m = a
            while True:
                out.add(m)
                if m == b:
                    break
                m = m % 12 + 1
        elif part[:3] in MONTHS:
            out.add(MONTHS.index(part[:3]) + 1)
    return out


class TripData:
    def __init__(self):
        d = pd.read_csv(DATA_DIR / "destinations.csv")
        d["peak_set"] = d["peak_months"].apply(parse_months)
        d["best_set"] = d["best_months"].apply(parse_months)
        self.dest = d.set_index("dest_id", drop=False)
        self.hubs = pd.read_csv(DATA_DIR / "hubs.csv").set_index("hub_id", drop=False)
        tm = pd.read_csv(DATA_DIR / "travel_matrix.csv")
        self.km = {(a, b): k for a, b, k in zip(tm.from_id, tm.to_id, tm.road_km_est)}
        self.minutes = {(a, b): m for a, b, m in zip(tm.from_id, tm.to_id, tm.drive_min_est)}

    def travel(self, a: str, b: str):
        """(road km, drive minutes) from a to b. Same place -> (0, 0)."""
        if a == b:
            return 0.0, 0.0
        return float(self.km[(a, b)]), float(self.minutes[(a, b)])

    def coords(self, node_id: str):
        row = self.dest.loc[node_id] if node_id in self.dest.index else self.hubs.loc[node_id]
        return float(row.latitude), float(row.longitude)

    def name(self, node_id: str) -> str:
        return self.dest.loc[node_id, "name"] if node_id in self.dest.index else self.hubs.loc[node_id, "name"]


@lru_cache(maxsize=1)
def get_data() -> TripData:
    return TripData()
