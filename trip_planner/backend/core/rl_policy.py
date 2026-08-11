"""Loads the trained RL model and uses it to build an itinerary."""
import logging
from functools import lru_cache

from .config import RL_MODEL_PATH
from .rl_env import full_mask, observe, to_sim_action
from .simulator import TripSimulator

log = logging.getLogger(__name__)


@lru_cache(maxsize=4)
def load_model(path: str = str(RL_MODEL_PATH)):
    try:
        from sb3_contrib import MaskablePPO
        return MaskablePPO.load(path, device="cpu")
    except Exception as e:
        log.warning("RL model not available (%s). Train it with: python -m rl.train", e)
        return None


def rl_available() -> bool:
    return load_model() is not None


def plan_with_rl(sim: TripSimulator, model=None) -> TripSimulator:
    model = model or load_model()
    if model is None:
        raise RuntimeError("RL model not trained yet")
    steps = 0
    while not sim.done and steps < 200:
        action, _ = model.predict(observe(sim), action_masks=full_mask(sim), deterministic=True)
        sim.step(to_sim_action(int(action), sim))
        steps += 1
    return sim
