from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class PlayerBase(BaseModel):
    name: str
    sport: str
    team: str
    position: str
    salary: int
    projected_points: float
    stats: Optional[Dict[str, Any]] = Field(default_factory=dict)

class PlayerCreate(PlayerBase):
    pass

class PlayerRead(PlayerBase):
    id: int

    class Config:
        from_attributes = True

class LineupRequest(BaseModel):
    sport: str
    salary_cap: int = 50000
    locked_players: List[int] = Field(default_factory=list)
    banned_players: List[int] = Field(default_factory=list)
    num_variations: int = 1

class LineupResponse(BaseModel):
    success: bool
    message: str
    total_points: float = 0.0
    total_salary: int = 0
    lineup: List[PlayerRead] = []
    lineups: List[Dict[str, Any]] = []

class SimulateRequest(BaseModel):
    projected_points: List[float]

class SimulateResponse(BaseModel):
    success: bool
    message: str
    simulations: List[float]
