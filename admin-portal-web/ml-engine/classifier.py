"""
Real-time Ticket Classifier
Loads the best trained model pipeline and classifies incoming ticket text
into L1, L2, or L3 severity. Used by the Admin Portal API.
"""

import os
import joblib
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "best_model_pipeline.joblib")

_pipeline = None


def _load_model():
    global _pipeline
    if _pipeline is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. "
                "Please run model_trainer.py first:\n"
                "  cd admin-portal-web/ml-engine\n"
                "  python data_generator.py\n"
                "  python model_trainer.py"
            )
        logger.info(f"Loading ML model from {MODEL_PATH}")
        _pipeline = joblib.load(MODEL_PATH)
        logger.info("Model loaded successfully.")
    return _pipeline


def classify(text: str) -> dict:
    """
    Classify a ticket description into L1, L2, or L3.

    Args:
        text: The raw ticket description string.

    Returns:
        dict with keys: label (str), confidence (float), all_probabilities (dict)
    """
    pipeline = _load_model()

    label = pipeline.predict([text])[0]

    # Get confidence probabilities if supported
    try:
        probs = pipeline.predict_proba([text])[0]
        classes = pipeline.classes_
        all_probs = {cls: round(float(p), 4) for cls, p in zip(classes, probs)}
        confidence = round(float(max(probs)), 4)
    except AttributeError:
        all_probs = {label: 1.0}
        confidence = 1.0

    return {
        "label": label,
        "confidence": confidence,
        "all_probabilities": all_probs,
    }


def get_label_description(label: str) -> str:
    descriptions = {
        "L1": "Basic — Can be resolved by Tier 1 support (password reset, connectivity, printing).",
        "L2": "Intermediate — Requires Tier 2 expertise (network config, AD, software deployment).",
        "L3": "Critical — Requires senior engineer / escalation (data corruption, security breach, outage).",
    }
    return descriptions.get(label, "Unknown severity level.")


if __name__ == "__main__":
    # Quick smoke test
    test_cases = [
        ("My WiFi keeps disconnecting", "L1"),
        ("VPN drops every 10 minutes after Windows update", "L2"),
        ("Production SQL Server database corruption — all transactions failing", "L3"),
    ]

    print("🔍 Classifier Smoke Test\n" + "-" * 50)
    for text, expected in test_cases:
        result = classify(text)
        status = "✅" if result["label"] == expected else "⚠️"
        print(f"{status} Input   : {text}")
        print(f"   Expected : {expected} | Predicted : {result['label']} (conf={result['confidence']})")
        print()
