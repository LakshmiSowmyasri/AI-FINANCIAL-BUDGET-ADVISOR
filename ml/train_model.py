from pathlib import Path

import joblib
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parent
DATA_CANDIDATES = [
    BASE_DIR / "financial_data_ml.csv",
    BASE_DIR / "data.csv",
    BASE_DIR / "dataset" / "data.csv",
]
DATA_PATH = next((path for path in DATA_CANDIDATES if path.exists()), DATA_CANDIDATES[0])
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODEL_DIR / "financial_health_xgboost.json"
LABEL_PATH = MODEL_DIR / "label_encoder.pkl"

FEATURES = [
    "Income",
    "Age",
    "Dependents",
    "Rent",
    "Loan_Repayment",
    "Insurance",
    "Groceries",
    "Transport",
    "Eating_Out",
    "Entertainment",
    "Utilities",
    "Healthcare",
    "Education",
    "Miscellaneous",
    "Desired_Savings_Percentage",
    "Desired_Savings",
    "Disposable_Income",
    "Total_Expenses",
    "Savings",
    "Savings_Rate",
    "Expense_Ratio",
]

def ensure_target(df):
    if "financial_health" in df.columns:
        return df

    expense_columns = [
        "Rent",
        "Loan_Repayment",
        "Insurance",
        "Groceries",
        "Transport",
        "Eating_Out",
        "Entertainment",
        "Utilities",
        "Healthcare",
        "Education",
        "Miscellaneous",
    ]

    df["Total_Expenses"] = df[expense_columns].sum(axis=1)
    df["Savings"] = df["Income"] - df["Total_Expenses"]
    df["Savings_Rate"] = (df["Savings"] / df["Income"]) * 100
    df["Expense_Ratio"] = (df["Total_Expenses"] / df["Income"]) * 100

    def financial_health(row):
        if row["Savings_Rate"] >= 20 and row["Expense_Ratio"] <= 70:
            return "Healthy"
        if row["Savings_Rate"] >= 10 and row["Expense_Ratio"] <= 85:
            return "Average"
        return "Poor"

    df["financial_health"] = df.apply(financial_health, axis=1)
    return df


df = pd.read_csv(DATA_PATH)
df = ensure_target(df)

for column in FEATURES:
    df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

X = df[FEATURES]
y = df["financial_health"].astype(str)

label_encoder = LabelEncoder()
y_encoded = label_encoder.fit_transform(y)
print("Target classes:")
print(label_encoder.classes_)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y_encoded,
    test_size=0.20,
    random_state=42,
    stratify=y_encoded,
)

print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))

model = XGBClassifier(
    n_estimators=400,
    max_depth=5,
    learning_rate=0.08,
    subsample=0.9,
    colsample_bytree=0.9,
    random_state=42,
    eval_metric="mlogloss",
    objective="multi:softprob",
)

print("\nTraining XGBoost model...")
model.fit(X_train, y_train)
print("Training completed!")

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
recall = recall_score(y_test, y_pred, average="weighted", zero_division=0)
f1 = f1_score(y_test, y_pred, average="weighted", zero_division=0)
conf_matrix = confusion_matrix(y_test, y_pred)

print("\n==============================")
print("MODEL PERFORMANCE")
print("==============================")
print(f"Accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")
print(f"Precision: {precision:.4f}")
print(f"Recall: {recall:.4f}")
print(f"F1-score: {f1:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))
print("\nConfusion Matrix:")
print(conf_matrix)

model.save_model(str(MODEL_PATH))
joblib.dump(label_encoder, str(LABEL_PATH))

print("\nModel saved successfully!")
print(f"Location: {MODEL_PATH}")
print(f"Label encoder: {LABEL_PATH}")