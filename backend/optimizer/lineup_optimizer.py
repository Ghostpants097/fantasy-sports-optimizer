import pulp
from typing import List, Dict, Any
from models.player import Player
import pandas as pd
import numpy as np
import random
from optimizer.ml_model import predict_points

def optimize_lineup(players: List[Player], sport: str, salary_cap: int, locked_players: List[int] = None, banned_players: List[int] = None, num_variations: int = 1) -> Dict[str, Any]:
    """
    Optimizes a fantasy sports lineup given a list of available players,
    a specific sport's constraints, and a salary cap using PuLP.
    """
    if not players:
        return {"success": False, "message": "No players available for optimization", "lineup": []}

    # ---------------------------------------------------------
    # MACHINE LEARNING PROJECTION ACCELERATOR
    # ---------------------------------------------------------
    # Convert players to DataFrame to predict actual dynamic points
    ml_data = []
    max_salary = max(p.salary for p in players) if players else 1
    for p in players:
        # We extract standard synthetic matchday features
        # In a real app, 'home_game', 'matchup', 'weather' would come from an external API
        ml_data.append({
            "salary_weight": p.salary / max_salary,
            "form": p.stats.get("form", 0.5) if p.stats else 0.5,
            "matchup_difficulty": random.uniform(0.1, 1.0), # Simulated matchday constraint
            "home_game": random.choice([0, 1]),             # Simulated coinflip
            "weather_factor": random.uniform(0.4, 1.0)      # Simulated weather
        })
    df_ml = pd.DataFrame(ml_data)
    try:
        predicted_scores = predict_points(df_ml)
        # Update players strictly in memory for the optimizer
        for i, p in enumerate(players):
            p.projected_points = max(0, round(predicted_scores[i], 2))
    except Exception as e:
        print(f"Warning: ML Predictive Engine failed ({e}). Falling back to baselines.")

    locked = locked_players or []
    banned = banned_players or []

    # Problem definition
    prob = pulp.LpProblem(f"Optimal_Lineup_{sport}", pulp.LpMaximize)

    # Decision variables: 1 if player is selected, 0 otherwise
    player_vars = {player.id: pulp.LpVariable(f"player_{player.id}", cat="Binary") for player in players}

    # Objective Function: Maximize total projected points
    prob += pulp.lpSum([players[i].projected_points * player_vars[players[i].id] for i in range(len(players))])

    # Constraint 1: Salary Cap
    prob += pulp.lpSum([players[i].salary * player_vars[players[i].id] for i in range(len(players))]) <= salary_cap

    # Constraint 2 & 3: Lock/Ban Specific Players
    for p in players:
        if p.id in locked:
            prob += player_vars[p.id] == 1
        elif p.id in banned:
            prob += player_vars[p.id] == 0

    # Constraint 4: Prevent Team Stacking (Max players from a single team)
    teams = list(set([p.team for p in players]))
    MAX_TEAM_STACK = 7 if sport == "IPL" else 5
    for team in teams:
        team_vars = [player_vars[p.id] for p in players if p.team == team]
        prob += pulp.lpSum(team_vars) <= MAX_TEAM_STACK

    # Sport-Specific Position Constraints
    if sport == "LaLiga":
        # 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD = 11 total
        gk_vars = [player_vars[p.id] for p in players if p.position == "GK"]
        def_vars = [player_vars[p.id] for p in players if p.position == "DEF"]
        mid_vars = [player_vars[p.id] for p in players if p.position == "MID"]
        fwd_vars = [player_vars[p.id] for p in players if p.position == "FWD"]
        
        prob += pulp.lpSum(gk_vars) == 1
        prob += pulp.lpSum(def_vars) >= 3
        prob += pulp.lpSum(def_vars) <= 5
        prob += pulp.lpSum(mid_vars) >= 2
        prob += pulp.lpSum(mid_vars) <= 5
        prob += pulp.lpSum(fwd_vars) >= 1
        prob += pulp.lpSum(fwd_vars) <= 3
        prob += pulp.lpSum([player_vars[p.id] for p in players]) == 11

    elif sport == "IPL":
        # 1-4 WK, 3-6 BAT, 1-4 AR, 3-6 BOWL = 11 total
        wk_vars = [player_vars[p.id] for p in players if p.position == "WK"]
        bat_vars = [player_vars[p.id] for p in players if p.position == "BAT"]
        ar_vars = [player_vars[p.id] for p in players if p.position == "AR"]
        bowl_vars = [player_vars[p.id] for p in players if p.position == "BOWL"]
        
        prob += pulp.lpSum(wk_vars) >= 1
        prob += pulp.lpSum(wk_vars) <= 4
        prob += pulp.lpSum(bat_vars) >= 3
        prob += pulp.lpSum(bat_vars) <= 6
        prob += pulp.lpSum(ar_vars) >= 1
        prob += pulp.lpSum(ar_vars) <= 4
        prob += pulp.lpSum(bowl_vars) >= 3
        prob += pulp.lpSum(bowl_vars) <= 6
        prob += pulp.lpSum([player_vars[p.id] for p in players]) == 11

    # Generate Multiple Variations iteratively
    all_lineups = []
    
    for variation in range(num_variations):
        try:
            prob.solve(pulp.PULP_CBC_CMD(msg=0))
        except Exception as e:
            if variation == 0:
                return {"success": False, "message": f"Optimization failed: {str(e)}", "lineups": []}
            break # Stop if we can't find more variations

        if pulp.LpStatus[prob.status] != "Optimal":
            if variation == 0:
                return {"success": False, "message": "Could not find an optimal lineup with the given constraints.", "lineups": []}
            break # Stop if no more optimal solutions exist under constraints
            
        # Extract selected players
        selected_player_ids = [p.id for p in players if player_vars[p.id].varValue == 1.0]
        selected_players = [p for p in players if p.id in selected_player_ids]
        
        # Calculate totals
        total_points = sum(p.projected_points for p in selected_players)
        total_salary = sum(p.salary for p in selected_players)
        
        lineup_data = [
            {
                "id": p.id,
                "name": p.name,
                "sport": p.sport,
                "team": p.team,
                "position": p.position,
                "salary": p.salary,
                "projected_points": p.projected_points
            }
            for p in selected_players
        ]
        
        all_lineups.append({
            "total_points": round(total_points, 2),
            "total_salary": total_salary,
            "lineup": lineup_data
        })
        
        # Add constraint to forbid this EXACT lineup in the next iteration
        # Basically: sum of variables currently = 1 must be <= len(selected)-1
        prob += pulp.lpSum([player_vars[pid] for pid in selected_player_ids]) <= len(selected_player_ids) - 1

    return {
        "success": True, 
        "message": f"Successfully generated {len(all_lineups)} lineup(s)", 
        "lineups": all_lineups,
        # Keep backwards compatibility for frontend relying on first result for summary
        "total_points": all_lineups[0]["total_points"] if all_lineups else 0,
        "total_salary": all_lineups[0]["total_salary"] if all_lineups else 0,
        "lineup": all_lineups[0]["lineup"] if all_lineups else []
    }
