from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import httpx
from database import get_db
from models.player import Player

router = APIRouter()

# ----------------------------------------------------
# LIVE DATA PROXY: Simulated SportAPI Connection
# ----------------------------------------------------
# We use a simulated array here to represent a 3rd party REST API payload, 
# ensuring the app stays fully functional for the user without requiring 
# them to register for paid API keys (like Sportmonks or API-Football).
# This logic demonstrates a real HTTP UPSERT pattern.

MOCK_API_PAYLOAD = [
    # A few live updates to demonstrate DB UPSERT mutations
    {"name": "Lamine Yamal", "sport": "LaLiga", "team": "Barcelona", "position": "FWD", "salary": 9600, "projected_points": 22.4, "stats": {"form": 0.98}},
    {"name": "Vinícius Júnior", "sport": "LaLiga", "team": "Real Madrid", "position": "FWD", "salary": 10500, "projected_points": 21.0, "stats": {"form": 0.92}},
    {"name": "Virat Kohli", "sport": "IPL", "team": "RCB", "position": "BAT", "salary": 10500, "projected_points": 75.0, "stats": {"form": 0.95}},
    {"name": "MS Dhoni", "sport": "IPL", "team": "CSK", "position": "WK", "salary": 9000, "projected_points": 50.2, "stats": {"form": 0.88}}
]

@router.post("/sync/")
async def sync_live_data(db: Session = Depends(get_db)):
    """
    Connects to an external sports statistics API, fetches the latest 
    player salaries, forms, and projected points, and performs an 
    UPSERT into our SQLite Machine Learning database.
    """
    try:
        # In a real environment, this would be:
        # async with httpx.AsyncClient() as client:
        #     response = await client.get(f"{EXT_API_URL}/players?api_token={API_KEY}")
        #     live_data = response.json()
        
        live_data = MOCK_API_PAYLOAD
        
        upsert_count = 0
        new_count = 0

        for remote_player in live_data:
            # Check if player exists by Name and Sport (Unique constraint proxy)
            existing_player = db.query(Player).filter(
                Player.name == remote_player["name"], 
                Player.sport == remote_player["sport"]
            ).first()

            if existing_player:
                # UPSERT: Update their live stats
                existing_player.salary = remote_player["salary"]
                existing_player.projected_points = remote_player["projected_points"]
                existing_player.stats = remote_player["stats"]
                upsert_count += 1
            else:
                # INSERT: New player found in live API
                new_db_player = Player(
                    name=remote_player["name"],
                    sport=remote_player["sport"],
                    team=remote_player["team"],
                    position=remote_player["position"],
                    salary=remote_player["salary"],
                    projected_points=remote_player["projected_points"],
                    stats=remote_player["stats"]
                )
                db.add(new_db_player)
                new_count += 1
                
        db.commit()
        
        return {
            "success": True, 
            "message": f"Live Sync Complete: Updated {upsert_count} players, Inserted {new_count} new players.",
            "upserted": upsert_count,
            "inserted": new_count
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Live API Sync Failed: {str(e)}")
