"""Train the RL itinerary model (MaskablePPO from sb3-contrib).

Examples (run from the backend folder):
    python -m rl.train                          # 300k steps, seed 0 -> models/rl_maskable_ppo.zip
    python -m rl.train --steps 50000            # quick test
    python -m rl.train --seed 3 --out models/seed3.zip
    python -m rl.train --no-crowd --out models/rl_nocrowd.zip   # ablation model without crowd info

Why MaskablePPO and not plain DQN: the agent must never pick a visited, closed-out or unaffordable place.
Action masking enforces that directly; DQN has no built-in masking. Explain this in Chapter 4.
Training log (reward per episode) is saved next to the model as *_monitor.csv for your reward curve.
"""
import argparse
import time
from pathlib import Path

import numpy as np
import pandas as pd

from core.config import DATA_DIR, MODEL_DIR, REWARD
from core.rl_env import TripEnv


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=300_000)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--out", default=str(MODEL_DIR / "rl_maskable_ppo.zip"))
    ap.add_argument("--no-crowd", action="store_true", help="ablation: hide crowd information")
    args = ap.parse_args()

    from sb3_contrib import MaskablePPO
    from stable_baselines3.common.monitor import Monitor

    train = pd.read_csv(DATA_DIR / "profiles_train.csv").to_dict(orient="records")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    env = Monitor(TripEnv(train, REWARD, use_crowd=not args.no_crowd, seed=args.seed),
                  filename=str(out.with_suffix("")) + "_monitor")

    model = MaskablePPO("MlpPolicy", env, seed=args.seed, verbose=0, learning_rate=3e-4,
                        n_steps=2048, batch_size=256, gamma=0.99, ent_coef=0.01,
                        policy_kwargs={"net_arch": [128, 128]}, device="cpu")
    t0 = time.time()
    model.learn(total_timesteps=args.steps, progress_bar=False)
    model.save(out)
    rewards = env.get_episode_rewards()
    print(f"Saved {out}  ({time.time() - t0:.0f}s, {len(rewards)} episodes)")
    print(f"Mean episode reward: first 200 = {np.mean(rewards[:200]):.3f}, last 200 = {np.mean(rewards[-200:]):.3f}")


if __name__ == "__main__":
    main()
