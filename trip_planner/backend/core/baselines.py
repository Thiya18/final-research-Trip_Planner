"""Baseline itinerary methods the RL model is compared against (Section 3.9).

B1 Greedy: always take the feasible place with the highest recommendation score.
B2 Nearest-neighbour: always take the closest feasible place.
When nothing fits in the rest of the day, both end the day.
"""
from .simulator import TripSimulator


def _run(sim: TripSimulator, choose) -> TripSimulator:
    while not sim.done:
        options = [j for j in range(sim.K) if sim.feasible(j)]
        sim.step(choose(sim, options) if options else sim.END_DAY)
    return sim


def greedy(sim: TripSimulator) -> TripSimulator:
    return _run(sim, lambda s, opts: max(opts, key=lambda j: s.c[j]["score"]))


def nearest(sim: TripSimulator) -> TripSimulator:
    return _run(sim, lambda s, opts: min(opts, key=lambda j: s.leg(j)[1]))
