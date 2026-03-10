from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import engine, Base, get_db
from models import player as player_models
from api import schemas, live_sync

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fantasy Sports Optimizer API")

import os

# Add CORS to allow frontend to communicate
from fastapi.middleware.cors import CORSMiddleware

# In production, this would be locked down to the specific Vercel URL
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://fantasy-sports-optimizer.vercel.app",  # Example deployment URL
    "*" # Allowed for ease of initial deployment testing
]

if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(live_sync.router, tags=["LiveAPI"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Fantasy Sports Optimizer API!"}

# Include legacy routes directly for backwards compatibility
@app.post("/players/", response_model=schemas.PlayerRead)
def create_player(player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    db_player = player_models.Player(**player.model_dump())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

@app.get("/players/", response_model=List[schemas.PlayerRead])
def read_players(skip: int = 0, limit: int = 1000, sport: str = None, db: Session = Depends(get_db)):
    query = db.query(player_models.Player)
    if sport:
        query = query.filter(player_models.Player.sport == sport)
    players_data = query.offset(skip).limit(limit).all()
    return players_data

from optimizer.lineup_optimizer import optimize_lineup

@app.post("/optimize/", response_model=schemas.LineupResponse)
def optimize(request: schemas.LineupRequest, db: Session = Depends(get_db)):
    # Fetch all players for the sport
    players_list = db.query(player_models.Player).filter(player_models.Player.sport == request.sport).all()
    
    if not players_list:
        raise HTTPException(status_code=404, detail=f"No players found for sport: {request.sport}")
        
    result = optimize_lineup(
        players=players_list, 
        sport=request.sport, 
        salary_cap=request.salary_cap,
        locked_players=request.locked_players,
        banned_players=request.banned_players,
        num_variations=request.num_variations
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
        
    return result

import numpy as np

@app.post("/simulate/", response_model=schemas.SimulateResponse)
def simulate_match(request: schemas.SimulateRequest):
    """
    Runs a 1000-iteration Monte Carlo simulation of a match to determine variance 
    and probability distributions of the team's total score.
    """
    n_sims = 1000
    team_scores = np.zeros(n_sims)
    
    for pts in request.projected_points:
        # Standard deviation modeled as roughly 35% of projected points for high variance
        std_dev = pts * 0.35
        # Simulate player performance across 1000 matches with Gaussian distribution
        simulated_player_scores = np.random.normal(pts, std_dev, n_sims)
        # Players generally don't get mathematically destroyed too far below zero
        simulated_player_scores = np.maximum(simulated_player_scores, -2.0)
        team_scores += simulated_player_scores
        
    return {
        "success": True, 
        "message": "Simulated 1000 scenarios successfully", 
        "simulations": team_scores.tolist()
    }
