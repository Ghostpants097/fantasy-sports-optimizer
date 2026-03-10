import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

MODEL_PATH = os.path.join(os.path.dirname(__file__), "points_predictor_rf.joblib")

def train_and_save_model():
    print("Generating synthetic historical dataset for Machine Learning training...")
    # Synthetic dataset mimicking historical performances
    # Features:
    # - Salary_Weight: Derived from salary (scales 0-1)
    # - Form: Recent performance metric (0-1)
    # - Matchup_Difficulty: How hard is the opponent (0-1, 1 is easiest)
    # - Home_Game: 1 if playing at home, 0 if away
    # - Weather_Factor: 0-1 (e.g., fast bowlers like 1.0, batters like 1.0)
    
    # We will generate 5000 random historical rows
    np.random.seed(42)
    n_samples = 5000
    
    salaries = np.random.uniform(0.3, 1.0, n_samples)
    form = np.random.uniform(0.1, 1.0, n_samples)
    matchup = np.random.uniform(0.1, 1.0, n_samples)
    home_game = np.random.choice([0, 1], n_samples)
    weather = np.random.uniform(0.4, 1.0, n_samples)
    
    # Base formula for actual points scored historically (with noise)
    # Salary is major driver, Form is high, Home game is a small bump, Matchup helps
    actual_points = (
        (salaries * 25.0) +
        (form * 15.0) +
        (matchup * 10.0) +
        (home_game * 5.0) +
        (weather * 8.0) +
        np.random.normal(0, 5.0, n_samples) # Add Gaussian noise
    )
    # Enforce realistic bounds (no negative points unless very rare disaster)
    actual_points = np.maximum(actual_points, -2.0)
    
    df = pd.DataFrame({
        "salary_weight": salaries,
        "form": form,
        "matchup_difficulty": matchup,
        "home_game": home_game,
        "weather_factor": weather,
        "actual_points": actual_points
    })
    
    X = df.drop(columns=["actual_points"])
    y = df["actual_points"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Regressor...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    score = model.score(X_test, y_test)
    print(f"Model trained successfully. R^2 Score on test set: {score:.4f}")
    
    # Save the model
    joblib.dump(model, MODEL_PATH)
    print(f"Model expertly serialized and saved to {MODEL_PATH}")

_model_cache = None

def predict_points(player_data_df: pd.DataFrame) -> np.ndarray:
    """
    Given a DataFrame matching the training features, dynamically predict points.
    Expected columns: ['salary_weight', 'form', 'matchup_difficulty', 'home_game', 'weather_factor']
    """
    global _model_cache
    if _model_cache is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Run training first.")
        _model_cache = joblib.load(MODEL_PATH)
        
    return _model_cache.predict(player_data_df)

if __name__ == "__main__":
    train_and_save_model()
