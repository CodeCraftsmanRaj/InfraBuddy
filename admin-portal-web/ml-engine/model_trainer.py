"""
ML Model Trainer
Loads the synthetic ticket dataset, trains Random Forest, SVM, and KNN classifiers,
generates a comparative report, and persists the best model for use by the portal API.
"""

import os
import json
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score
from sklearn.pipeline import Pipeline

DATA_PATH = "data/synthetic_tickets.csv"
MODEL_DIR = "models"
REPORT_PATH = "models/comparison_report.json"


def load_data() -> tuple:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. "
            "Please run data_generator.py first."
        )
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} samples | Labels: {df['label'].value_counts().to_dict()}")
    return df["text"].tolist(), df["label"].tolist()


def evaluate_model(name: str, pipeline: Pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    metrics = {
        "model": name,
        "accuracy": round(accuracy_score(y_test, y_pred), 4),
        "precision_macro": round(precision_score(y_test, y_pred, average="macro", zero_division=0), 4),
        "recall_macro": round(recall_score(y_test, y_pred, average="macro", zero_division=0), 4),
        "f1_macro": round(f1_score(y_test, y_pred, average="macro", zero_division=0), 4),
        "per_class": {
            cls: {
                "precision": round(report[cls]["precision"], 4),
                "recall": round(report[cls]["recall"], 4),
                "f1_score": round(report[cls]["f1-score"], 4),
                "support": int(report[cls]["support"]),
            }
            for cls in ["L1", "L2", "L3"] if cls in report
        },
    }
    return metrics


def train_and_compare():
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    models = {
        "Random Forest": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ("clf", RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)),
        ]),
        "SVM": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ("clf", SVC(kernel="rbf", C=10, gamma="scale", probability=True, random_state=42)),
        ]),
        "KNN": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
            ("clf", KNeighborsClassifier(n_neighbors=7, metric="cosine")),
        ]),
    }

    os.makedirs(MODEL_DIR, exist_ok=True)

    results = []
    best_model_name = None
    best_f1 = -1.0
    best_pipeline = None

    print("\n" + "=" * 60)
    print("  MODEL COMPARISON REPORT")
    print("=" * 60)

    for name, pipeline in models.items():
        print(f"\nTraining {name}...")
        pipeline.fit(X_train, y_train)
        metrics = evaluate_model(name, pipeline, X_test, y_test)
        results.append(metrics)

        print(f"  Accuracy  : {metrics['accuracy']:.4f}")
        print(f"  Precision : {metrics['precision_macro']:.4f}")
        print(f"  Recall    : {metrics['recall_macro']:.4f}")
        print(f"  F1 Macro  : {metrics['f1_macro']:.4f}")

        # Save each model
        model_path = os.path.join(MODEL_DIR, f"{name.lower().replace(' ', '_')}_pipeline.joblib")
        joblib.dump(pipeline, model_path)
        metrics["model_path"] = model_path
        print(f"  Saved to {model_path}")

        if metrics["f1_macro"] > best_f1:
            best_f1 = metrics["f1_macro"]
            best_model_name = name
            best_pipeline = pipeline

    # Save the best model as the primary classifier
    best_path = os.path.join(MODEL_DIR, "best_model_pipeline.joblib")
    joblib.dump(best_pipeline, best_path)

    print("\n" + "=" * 60)
    print(f"  Best Model: {best_model_name} (F1={best_f1:.4f})")
    print("=" * 60)

    report = {
        "best_model": best_model_name,
        "best_f1_macro": best_f1,
        "results": results,
    }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved to {REPORT_PATH}")

    return report


if __name__ == "__main__":
    train_and_compare()
