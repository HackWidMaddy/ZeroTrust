import argparse
import json
import math
import os
from typing import List

import numpy as np


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Dummy local training step for federated learning demo")
    parser.add_argument("--in", dest="in_path", required=False, help="Path to input weights JSON (list of floats)")
    parser.add_argument("--out", dest="out_path", required=True, help="Path to write updated weights JSON")
    parser.add_argument("--vector_size", type=int, default=100, help="Number of weights if no input provided")
    parser.add_argument("--steps", type=int, default=50, help="Number of SGD steps to run")
    parser.add_argument("--lr", type=float, default=0.05, help="Learning rate")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    return parser.parse_args()


def load_weights(path: str | None, vector_size: int) -> np.ndarray:
    if path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        arr = np.array(data, dtype=np.float64)
        if arr.shape[0] != vector_size:
            # pad or trim to vector_size
            if arr.shape[0] < vector_size:
                pad = np.zeros(vector_size - arr.shape[0], dtype=np.float64)
                arr = np.concatenate([arr, pad], axis=0)
            else:
                arr = arr[:vector_size]
        return arr
    return np.zeros(vector_size, dtype=np.float64)


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def train_dummy_logistic(weights: np.ndarray, steps: int, lr: float, rng: np.random.Generator) -> np.ndarray:
    """Train a tiny logistic regression on synthetic data to update weights.

    - Features: vector_size
    - Labels: y = sigmoid(w* x + noise) > 0.5
    - One minibatch per step
    """
    vector_size = weights.shape[0]
    batch_size = 64

    w = weights.copy()
    for _ in range(steps):
        # synthetic data
        X = rng.normal(loc=0.0, scale=1.0, size=(batch_size, vector_size))
        true_w = rng.normal(0.0, 0.5, size=(vector_size,))
        logits = X @ true_w + rng.normal(0.0, 0.1, size=(batch_size,))
        y = (sigmoid(logits) > 0.5).astype(np.float64)

        # model forward
        pred = sigmoid(X @ w)
        # binary cross-entropy gradient wrt w: X^T (pred - y) / batch
        grad = (X.T @ (pred - y)) / batch_size

        # SGD step
        w -= lr * grad

    return w


def main() -> None:
    args = parse_args()
    rng = np.random.default_rng(args.seed)

    weights = load_weights(args.in_path, args.vector_size)
    updated = train_dummy_logistic(weights, steps=args.steps, lr=args.lr, rng=rng)

    # to python list of floats with reasonable precision
    out_list: List[float] = [float(x) for x in updated.tolist()]
    with open(args.out_path, "w", encoding="utf-8") as f:
        json.dump(out_list, f)


if __name__ == "__main__":
    main()



