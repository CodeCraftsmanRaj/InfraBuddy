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
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score
from sklearn.pipeline import Pipeline

DATA_PATH = "data/tickets_anonymized_L123.xlsx"
MODEL_DIR = "models"
REPORT_PATH = "models/comparison_report.json"


def load_data() -> tuple:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}. "
            "Please ensure the file is present in the data/ directory."
        )
    
    # Load Excel
    df = pd.read_excel(DATA_PATH)
    
    # Feature Engineering: Use only Description as requested
    df['description'] = df['description'].fillna('').astype(str)
    
    # Data Cleaning: Filter out noisy rows
    initial_count = len(df)
    df = df[df['description'].str.len() > 15]
    
    # 2. Remove rows that look like "test" entries
    test_keywords = ["test test", "testing testing", "dummy", "sample ticket"]
    for kw in test_keywords:
        df = df[~df['description'].str.lower().str.contains(kw, na=False)]
        
    # 3. Handle support_tier
    df = df.dropna(subset=["support_tier"])
    df["support_tier"] = df["support_tier"].astype(str).str.upper().str.strip()
    valid_labels = ["L1", "L2", "L3"]
    df = df[df["support_tier"].isin(valid_labels)]
    
    print(f"Loaded {len(df)} samples (Filtered {initial_count - len(df)} noisy rows)")
    print(f"Labels: {df['support_tier'].value_counts().to_dict()}")
    
    return df["description"].tolist(), df["support_tier"].tolist()


def evaluate_model(name: str, pipeline: Pipeline, X, y, dataset_name="Test") -> dict:
    y_pred = pipeline.predict(X)
    report = classification_report(y, y_pred, output_dict=True, zero_division=0)
    metrics = {
        "model": name,
        "dataset": dataset_name,
        "accuracy": round(accuracy_score(y, y_pred), 4),
        "precision_macro": round(precision_score(y, y_pred, average="macro", zero_division=0), 4),
        "recall_macro": round(recall_score(y, y_pred, average="macro", zero_division=0), 4),
        "f1_macro": round(f1_score(y, y_pred, average="macro", zero_division=0), 4),
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
    
    # 70/15/15 split
    # First split: 70% train, 30% remaining
    X_train, X_rem, y_train, y_rem = train_test_split(
        X, y, train_size=0.7, random_state=42, stratify=y
    )
    
    # Second split: 50% of remaining for val, 50% for test (15% each of total)
    X_val, X_test, y_val, y_test = train_test_split(
        X_rem, y_rem, test_size=0.5, random_state=42, stratify=y_rem
    )

    models = {
        "Logistic Regression": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, stop_words='english')),
            ("clf", LogisticRegression(max_iter=1000, random_state=42)),
        ]),
        "Random Forest": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, stop_words='english')),
            ("clf", RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)),
        ]),
        "SVM": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, stop_words='english')),
            ("clf", SVC(kernel="rbf", C=10, gamma="scale", probability=True, random_state=42)),
        ]),
        "KNN": Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, stop_words='english')),
            ("clf", KNeighborsClassifier(n_neighbors=5, metric="cosine")),
        ]),
    }

    os.makedirs(MODEL_DIR, exist_ok=True)

    results = []
    best_model_name = None
    best_f1 = -1.0
    best_pipeline = None

    print("\n" + "=" * 60)
    print("  MODEL COMPARISON REPORT (70/15/15 Split)")
    print("=" * 60)

    for name, pipeline in models.items():
        print(f"\nTraining {name}...")
        pipeline.fit(X_train, y_train)
        
        # Evaluate on Validation set
        val_metrics = evaluate_model(name, pipeline, X_val, y_val, dataset_name="Validation")
        # Evaluate on Test set
        test_metrics = evaluate_model(name, pipeline, X_test, y_test, dataset_name="Test")
        
        results.append({
            "model": name,
            "val_metrics": val_metrics,
            "test_metrics": test_metrics
        })

        print(f"  [Val]  Accuracy: {val_metrics['accuracy']:.4f} | F1: {val_metrics['f1_macro']:.4f}")
        print(f"  [Test] Accuracy: {test_metrics['accuracy']:.4f} | F1: {test_metrics['f1_macro']:.4f}")

        # Save each model
        model_path = os.path.join(MODEL_DIR, f"{name.lower().replace(' ', '_')}_pipeline.joblib")
        joblib.dump(pipeline, model_path)
        print(f"  Saved to {model_path}")

        # Choose best based on Validation F1
        if val_metrics["f1_macro"] > best_f1:
            best_f1 = val_metrics["f1_macro"]
            best_model_name = name
            best_pipeline = pipeline

    # Save the best model as the primary classifier
    best_path = os.path.join(MODEL_DIR, "best_model_pipeline.joblib")
    joblib.dump(best_pipeline, best_path)

    print("\n" + "=" * 60)
    print(f"  Best Model: {best_model_name} (Val F1={best_f1:.4f})")
    # Get final test accuracy for the best model
    best_test_acc = 0.0
    for r in results:
        if r["model"] == best_model_name:
            best_test_acc = r["test_metrics"]["accuracy"]
            break
    print(f"  Final Test Accuracy: {best_test_acc:.4f}")
    print("=" * 60)

    # Prepare a flattened version for the dashboard
    dashboard_results = []
    for r in results:
        # Use test_metrics as the primary metrics for the dashboard
        flat_r = {
            "model": r["model"],
            "accuracy": r["test_metrics"]["accuracy"],
            "precision_macro": r["test_metrics"]["precision_macro"],
            "recall_macro": r["test_metrics"]["recall_macro"],
            "f1_macro": r["test_metrics"]["f1_macro"],
            "per_class": r["test_metrics"]["per_class"]
        }
        dashboard_results.append(flat_r)

    report = {
        "best_model": best_model_name,
        "best_f1_macro": best_f1, # Frontend expects this name
        "best_val_f1_macro": best_f1,
        "best_test_accuracy": best_test_acc,
        "split_info": "70% Train, 15% Validation, 15% Test",
        "results": dashboard_results,
        "full_results": results # Keep the detailed view
    }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report saved to {REPORT_PATH}")

    return report


if __name__ == "__main__":
    train_and_compare()
