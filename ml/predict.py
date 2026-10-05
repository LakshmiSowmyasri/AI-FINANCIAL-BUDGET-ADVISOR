from pathlib import Path

import joblib
import pandas as pd
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "financial_health_xgboost.json"
LABEL_PATH = BASE_DIR / "models" / "label_encoder.pkl"

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

model = XGBClassifier()
model.load_model(str(MODEL_PATH))
label_encoder = joblib.load(str(LABEL_PATH))


def predict_financial_health(data):
    feature_row = {feature: 0 for feature in FEATURES}
    for key, value in data.items():
        if key in feature_row:
            feature_row[key] = float(value)

    if "Income" in data and "Total_Expenses" in data and "Savings" not in data:
        feature_row["Savings"] = max(0.0, float(data["Income"]) - float(data["Total_Expenses"]))

    if "Income" in data and "Savings" in data and "Savings_Rate" not in data:
        income = float(data["Income"]) or 1
        feature_row["Savings_Rate"] = (float(data["Savings"]) / income) * 100

    if "Income" in data and "Total_Expenses" in data and "Expense_Ratio" not in data:
        income = float(data["Income"]) or 1
        feature_row["Expense_Ratio"] = (float(data["Total_Expenses"]) / income) * 100

    input_data = pd.DataFrame([feature_row], columns=FEATURES)
    prediction = model.predict(input_data)[0]
    probabilities = model.predict_proba(input_data)[0]
    result = label_encoder.inverse_transform([prediction])[0]
    confidence = float(max(probabilities))

    return {
        "prediction": result,
        "confidence": round(confidence * 100, 2),
    }


if __name__ == "__main__":
    sample_data = {
        "Income": 50000,
        "Age": 25,
        "Dependents": 1,
        "Rent": 10000,
        "Loan_Repayment": 3000,
        "Insurance": 1500,
        "Groceries": 5000,
        "Transport": 2500,
        "Eating_Out": 2000,
        "Entertainment": 1500,
        "Utilities": 2500,
        "Healthcare": 1000,
        "Education": 1000,
        "Miscellaneous": 1500,
        "Desired_Savings_Percentage": 20,
        "Desired_Savings": 10000,
        "Disposable_Income": 22000,
        "Total_Expenses": 28000,
        "Savings": 22000,
        "Savings_Rate": 44,
        "Expense_Ratio": 56,
    }

    result = predict_financial_health(sample_data)
    print("\nPrediction:")
    print(result)