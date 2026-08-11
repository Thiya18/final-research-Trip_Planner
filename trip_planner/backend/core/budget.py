"""Budget estimation (Section 4.6.4): fees + transport + meals + rooms. An estimate, not an optimisation."""
import math

from .config import COSTS
from .profile import UserProfile


def entrance_fee(dest_row, p: UserProfile) -> float:
    if p.traveller_type == "international":
        per_person = float(dest_row.fee_foreign_usd) * COSTS["usd_to_lkr"]
    else:
        per_person = float(dest_row.fee_local_lkr)
    return per_person * p.group_size


def transport_cost(km: float, p: UserProfile) -> float:
    rate = COSTS["transport_per_km"][p.transport_mode]
    if p.transport_mode == "bus":
        units = p.group_size                      # bus fare is per person
    elif p.transport_mode == "tuk_tuk":
        units = math.ceil(p.group_size / 3)       # 3 passengers per tuk
    else:
        units = math.ceil(p.group_size / 4)       # 4 passengers per car / van
    return km * rate * units


def estimate(days: list, p: UserProfile) -> dict:
    """days = itinerary days from the simulator (each stop has fee_lkr and leg_km)."""
    fees = sum(s["fee_lkr"] for d in days for s in d["stops"])
    km = sum(s["leg_km"] for d in days for s in d["stops"])
    transport = transport_cost(km, p)
    total = fees + transport + p.meals_cost + p.accommodation_cost
    return {
        "entrance_fees": round(fees),
        "transport": round(transport),
        "meals": round(p.meals_cost),
        "accommodation": round(p.accommodation_cost),
        "total": round(total),
        "per_person": round(total / p.group_size),
        "your_budget": round(p.total_budget),
        "within_budget": bool(total <= p.total_budget),
        "total_km": round(km, 1),
        "budget_level": p.budget_level,
        "nights": p.nights,
        "rooms": p.rooms,
        "currency": "LKR",
        "note": "Estimate from reference prices. Prices change with season.",
    }
