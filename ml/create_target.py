from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_CANDIDATES = [
    BASE_DIR / "data.csv",
    BASE_DIR / "dataset" / "data.csv",
]
DATA_PATH = next((path for path in DATA_CANDIDATES if path.exists()), DATA_CANDIDATES[0])
OUTPUT_PATH = BASE_DIR / "financial_data_ml.csv"

# Load dataset
df = pd.read_csv(DATA_PATH)

# Calculate total expenses
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

# Clearly defined target logic
# Healthy: strong savings rate and controlled spending burden
# Average: moderate savings rate and acceptable spending burden
# Poor: weak savings rate or overspending burden

def financial_health(row):
    if row["Savings_Rate"] >= 20 and row["Expense_Ratio"] <= 70:
        return "Healthy"
    if row["Savings_Rate"] >= 10 and row["Expense_Ratio"] <= 85:
        return "Average"
    return "Poor"


df["financial_health"] = df.apply(financial_health, axis=1)

# Clean a few numeric columns the ML pipeline expects
numeric_columns = [
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
for column in numeric_columns:
    df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

# Save new dataset
df.to_csv(OUTPUT_PATH, index=False)

print(f"Source dataset: {DATA_PATH}")
print(f"Saved dataset: {OUTPUT_PATH}")
print("Financial health target created successfully!")
print("\nClass distribution:")
print(df["financial_health"].value_counts())
print("\nNew dataset shape:")
print(df.shape)