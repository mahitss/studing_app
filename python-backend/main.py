import json
import os
import traceback
import threading
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64

from fastapi.middleware.cors import CORSMiddleware

# Top-level guard for scikit-learn
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import LabelEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    expected_token = os.environ.get("JWT_SECRET")
    if expected_token:
        if token != expected_token:
            raise HTTPException(status_code=401, detail="Unauthorized: invalid token")
    else:
        if token != "612912a49954c0cb79e5aeb40540c5ebb2a35cc93442f83938ed38c3d6b602fd":
            raise HTTPException(status_code=401, detail="Unauthorized: invalid token")

def coerce_object_id(v):
    if isinstance(v, dict) and "$oid" in v:
        return v["$oid"]
    if isinstance(v, dict):
        return str(v)
    return str(v) if v is not None else ""

ObjectIdStr = Annotated[str, BeforeValidator(coerce_object_id)]

app = FastAPI(title="GrindLock Neural Analytics Engine")

# Add CORS middleware with env-based allowed origins
ALLOWED_ORIGINS_ENV = os.environ.get("ALLOWED_ORIGINS")
if ALLOWED_ORIGINS_ENV:
    ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]
else:
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "https://grindlock.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic models for incoming data
class PauseItem(BaseModel):
    startedAt: str
    endedAt: Optional[str] = None
    reason: Optional[str] = None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")

class StudySession(BaseModel):
    id: ObjectIdStr = Field(default="", alias="_id")
    userId: ObjectIdStr = ""
    date: str = ""
    startedAt: str = ""
    endedAt: Optional[str] = None
    status: str = "completed"
    pauseCount: int = 0
    pauses: List[PauseItem] = []
    focusedMinutes: float = 0
    inactiveSeconds: float = 0
    subject: str = "General"
    studyMode: str = "custom"
    plannedDurationMinutes: float = 0

    model_config = ConfigDict(from_attributes=True, populate_by_name=True, extra="ignore")

class AnalyticsRequest(BaseModel):
    sessions: List[StudySession]
    model_config = ConfigDict(from_attributes=True, extra="ignore")

def create_base64_plot(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches='tight', transparent=True)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64

@app.post("/analyze", dependencies=[Depends(verify_token)])
def analyze_sessions(payload: AnalyticsRequest):
    sessions = payload.sessions
    if not sessions:
        return {
            "average_study_time": 0,
            "consistency_score": 0,
            "best_study_time": "Not enough data",
            "focus_score": 0,
            "weak_pattern": "Keep studying to unlock weak pattern detection!",
            "message": "We need more study sessions to generate valid analytics.",
            "graphs": {}
        }

    # Convert to pandas DataFrame
    df = pd.DataFrame([s.model_dump() for s in sessions])
    
    # Filter only completed sessions for reliable stats
    df = df[df['status'] == 'completed']
    if df.empty:
         return {
            "average_study_time": 0,
            "consistency_score": 0,
            "best_study_time": "Not enough data",
            "focus_score": 0,
            "weak_pattern": "Keep studying to unlock weak pattern detection!",
            "message": "Complete some sessions to see insights.",
            "graphs": {}
        }

    # Parse dates
    df['startedAt'] = pd.to_datetime(df['startedAt'])
    if 'endedAt' in df.columns:
        df['endedAt'] = pd.to_datetime(df['endedAt'])

    # Total duration calculation (custom since we need exact time excluding inactive)
    # Using startedAt and endedAt if available, else roughly use focusedMinutes
    def calculate_total_time(row):
        if pd.notna(row['endedAt']):
            return (row['endedAt'] - row['startedAt']).total_seconds() / 60
        return row['focusedMinutes'] + (row['inactiveSeconds'] / 60)
        
    df['total_duration_minutes'] = df.apply(calculate_total_time, axis=1)

    # 1. Study Analytics Engine calculations
    # Average study time
    avg_duration = df['total_duration_minutes'].mean()
    average_study_time = int(avg_duration) if pd.notna(avg_duration) else 0
    
    # Consistency %: Number of unique days studied over the span
    total_days_span = max((df['startedAt'].dt.date.max() - df['startedAt'].dt.date.min()).days + 1, 1)
    unique_study_days = df['date'].nunique()
    consistency_score = int((unique_study_days / total_days_span) * 100)
    consistency_score = min(consistency_score, 100)
    
    # Best study time (time of day)
    df['hour'] = df['startedAt'].dt.hour
    time_of_day_bins = [0, 6, 12, 18, 24]
    labels = ['Night (12am-6am)', 'Morning (6am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (6pm-12am)']
    df['time_of_day'] = pd.cut(df['hour'], bins=time_of_day_bins, labels=labels, right=False)
    
    # Analyze productivity per time of day
    best_study_time_label = "Anytime"
    productivity_boost = 0
    try:
        grouped_tod = df.groupby('time_of_day', observed=False)['focusedMinutes'].mean().dropna()
        if not grouped_tod.empty:
            best_tod = grouped_tod.idxmax()
            best_avg = grouped_tod.max()
            overall_avg = df['focusedMinutes'].mean()
            if overall_avg > 0 and (best_avg - overall_avg) > 0:
                productivity_boost = int(((best_avg - overall_avg) / overall_avg) * 100)
                best_study_time_label = str(best_tod)
    except Exception as e:
        pass

    message = f"You are {productivity_boost}% more productive at {best_study_time_label.split(' ')[0]}" if productivity_boost > 0 else "You are consistently productive throughout the day!"

    # 2. Focus Score Algorithm
    total_focus_time = df['focusedMinutes'].sum()
    total_duration_time = df['total_duration_minutes'].sum()

    focus_score = 0
    if total_duration_time > 0:
        focus_score = int((total_focus_time / total_duration_time) * 100)
        focus_score = min(focus_score, 100)

    # 3. Weak Pattern Detection
    df['weekday'] = df['startedAt'].dt.day_name()
    weak_pattern_text = "No obvious weak patterns detected yet!"
    
    grouped_days = df.groupby('weekday')['focusedMinutes'].sum()
    if not grouped_days.empty and len(grouped_days) > 1:
        worst_day = grouped_days.idxmin()
        weak_pattern_text = f"You fail mostly on {worst_day}s"

    # 4. ML Predictions
    ml_insights = {}
    if len(df) > 5 and SKLEARN_AVAILABLE:
        try:
            import datetime

            le_day = LabelEncoder()
            df['day_encoded'] = le_day.fit_transform(df['weekday'])
            
            X = df[['day_encoded', 'hour']]
            y = df['focusedMinutes']
            
            rf = RandomForestRegressor(n_estimators=50, random_state=42)
            rf.fit(X, y)
            
            now = datetime.datetime.now()
            current_day_str = now.strftime('%A')
            current_hour = now.hour
            
            if current_day_str in le_day.classes_:
                current_day_encoded = le_day.transform([current_day_str])[0]
                predicted_minutes = rf.predict([[current_day_encoded, current_hour]])[0]
                ml_insights["prediction_text"] = f"Based on your habits, if you start studying now, our ML model predicts you will focus for ~{int(predicted_minutes)} minutes."
            else:
                ml_insights["prediction_text"] = "Not enough varied day data to predict right now."
        except Exception as e:
            ml_insights["prediction_text"] = "Gathering more data for AI predictions..."
    else:
        ml_insights["prediction_text"] = "Gathering more data for AI predictions..." if not SKLEARN_AVAILABLE else "Need more than 5 sessions to unlock AI predictions."

    # 6. Burnout Detection Algorithm (Advanced Heuristics)
    burnout_risk = "Low"
    burnout_score = 0
    intervention_message = "Your neural load is optimal. Keep going."

    # Heuristic: If focused minutes per day > 480 (8 hours) consistently
    daily_totals = df.groupby('date')['focusedMinutes'].sum()
    high_intensity_days = daily_totals[daily_totals > 480].count()
    
    # Heuristic: If average focus score is declining over the last 3 days
    recent_focus = df.sort_values('startedAt', ascending=False).head(5)['focusedMinutes'].mean()
    historical_focus = df['focusedMinutes'].mean()
    
    if high_intensity_days >= 2:
        burnout_score += 40
    if recent_focus < historical_focus * 0.7:
        burnout_score += 30
    if df['pauseCount'].mean() > 5:
        burnout_score += 20

    if burnout_score >= 70:
        burnout_risk = "CRITICAL"
        intervention_message = "CRITICAL BURN-OUT DETECTED: Disconnect immediately. Your focus efficiency is tanking."
    elif burnout_score >= 40:
        burnout_risk = "MODERATE"
        intervention_message = "Neural strain detected. Consider a 15-minute bio-break."

    # 7. Visualization Engine
    graphs = {}
    try:
        # Focus Trend Graph
        plt.figure(figsize=(10, 4))
        sns.lineplot(data=df.sort_values('startedAt'), x='startedAt', y='focusedMinutes', marker='o', color='#00f2ff')
        plt.title("Neural Focus Trajectory", color='white', pad=20)
        plt.xlabel("Timeline", color='#888')
        plt.ylabel("Focused Minutes", color='#888')
        plt.grid(True, alpha=0.1)
        graphs["focus_trend"] = create_base64_plot(plt.gcf())

        # Subject Distribution
        plt.figure(figsize=(6, 6))
        subject_data = df.groupby('subject')['focusedMinutes'].sum()
        plt.pie(subject_data, labels=subject_data.index, autopct='%1.1f%%', colors=sns.color_palette("husl", len(subject_data)))
        plt.title("Knowledge Cluster Distribution", color='white')
        graphs["subject_distribution"] = create_base64_plot(plt.gcf())
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Graph generation failed: {error_details}")
        graphs = {"error": f"Visualization engine offline: {str(e)}"}

    return {
        "average_study_time": average_study_time,
        "consistency_score": consistency_score,
        "best_study_time": best_study_time_label,
        "focus_score": focus_score,
        "weak_pattern": weak_pattern_text,
        "message": message,
        "ml_insights": ml_insights,
        "burnout": {
            "risk": burnout_risk,
            "score": burnout_score,
            "intervention": intervention_message
        },
        "graphs": graphs
    }

class MatchmakingRequest(BaseModel):
    userId: ObjectIdStr
    timezone: str
    studyMode: str
    targetMinutes: int
    model_config = ConfigDict(from_attributes=True, extra="ignore")

# Absolute path to matchmaking pool
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POOL_FILE = os.path.join(SCRIPT_DIR, "matchmaking_pool.json")
pool_lock = threading.Lock()

@app.post("/matchmake", dependencies=[Depends(verify_token)])
def matchmake_users(req: MatchmakingRequest):
    with pool_lock:
        active_pool = []
        if os.path.exists(POOL_FILE):
            try:
                with open(POOL_FILE, "r") as f:
                    active_pool = json.load(f)
            except:
                active_pool = []
        
        best_match = None
        for candidate in active_pool:
            if candidate["userId"] != req.userId and candidate["studyMode"] == req.studyMode:
                if abs(candidate["targetMinutes"] - req.targetMinutes) <= 30:
                    best_match = candidate
                    break
        
        if best_match:
            active_pool.remove(best_match)
            temp_file = POOL_FILE + ".tmp"
            try:
                with open(temp_file, "w") as f:
                    json.dump(active_pool, f)
                os.replace(temp_file, POOL_FILE)
            except Exception as e:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            return {"matchFound": True, "partnerId": best_match["userId"], "message": "Optimal partner located."}
        
        active_pool = [u for u in active_pool if u["userId"] != req.userId]
        active_pool.append({
            "userId": req.userId,
            "timezone": req.timezone,
            "studyMode": req.studyMode,
            "targetMinutes": req.targetMinutes
        })
        temp_file = POOL_FILE + ".tmp"
        try:
            with open(temp_file, "w") as f:
                json.dump(active_pool, f)
            os.replace(temp_file, POOL_FILE)
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        return {"matchFound": False, "message": "Entering matchmaking pool. Awaiting optimal partner..."}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
