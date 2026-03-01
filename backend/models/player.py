from sqlalchemy import Column, Integer, String, Float, JSON
from database import Base

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    sport = Column(String, index=True)  # 'NFL', 'NBA', 'MLB', 'EPL'
    team = Column(String, index=True)
    position = Column(String, index=True)
    salary = Column(Integer, nullable=False, default=0)
    projected_points = Column(Float, nullable=False, default=0.0)
    
    # Store dynamic or sport-specific stats here
    stats = Column(JSON, nullable=True)
