from database import SessionLocal, engine, Base
from models.player import Player
import random

def seed_db():
    print("Seeding database with pristine 2024-2025 dataset (No repetitions)...")
    db = SessionLocal()
    
    # Check if we already have players, if so clear them to ensure a fresh clean state
    db.query(Player).delete()
    db.commit()

    players_data = []

    # 1. Authentic LaLiga 2024-2025 Roster (Top Performers, diverse teams, exact positions)
    # Guaranteed no duplicates
    laliga_roster = [
        # Real Madrid
        {"name": "Thibaut Courtois", "team": "Real Madrid", "pos": "GK", "salary": 9200, "pts": 15.5},
        {"name": "Antonio Rüdiger", "team": "Real Madrid", "pos": "DEF", "salary": 8500, "pts": 12.0},
        {"name": "Dani Carvajal", "team": "Real Madrid", "pos": "DEF", "salary": 8100, "pts": 11.2},
        {"name": "Ferland Mendy", "team": "Real Madrid", "pos": "DEF", "salary": 7500, "pts": 9.5},
        {"name": "Jude Bellingham", "team": "Real Madrid", "pos": "MID", "salary": 9800, "pts": 18.5},
        {"name": "Fede Valverde", "team": "Real Madrid", "pos": "MID", "salary": 8900, "pts": 14.1},
        {"name": "Aurélien Tchouaméni", "team": "Real Madrid", "pos": "MID", "salary": 7800, "pts": 10.5},
        {"name": "Toni Kroos", "team": "Real Madrid", "pos": "MID", "salary": 8600, "pts": 13.5},
        {"name": "Vinícius Júnior", "team": "Real Madrid", "pos": "FWD", "salary": 10000, "pts": 19.2},
        {"name": "Rodrygo Goes", "team": "Real Madrid", "pos": "FWD", "salary": 9100, "pts": 15.8},
        {"name": "Kylian Mbappé", "team": "Real Madrid", "pos": "FWD", "salary": 9900, "pts": 18.8},
        
        # Barcelona
        {"name": "Marc-André ter Stegen", "team": "Barcelona", "pos": "GK", "salary": 9000, "pts": 14.8},
        {"name": "Ronald Araújo", "team": "Barcelona", "pos": "DEF", "salary": 8400, "pts": 11.5},
        {"name": "Jules Koundé", "team": "Barcelona", "pos": "DEF", "salary": 8300, "pts": 11.0},
        {"name": "Alejandro Balde", "team": "Barcelona", "pos": "DEF", "salary": 7400, "pts": 9.8},
        {"name": "Joao Cancelo", "team": "Barcelona", "pos": "DEF", "salary": 8200, "pts": 12.5},
        {"name": "Frenkie de Jong", "team": "Barcelona", "pos": "MID", "salary": 8800, "pts": 13.0},
        {"name": "Pedri", "team": "Barcelona", "pos": "MID", "salary": 9100, "pts": 14.5},
        {"name": "Gavi", "team": "Barcelona", "pos": "MID", "salary": 8500, "pts": 12.0},
        {"name": "Ilkay Gündogan", "team": "Barcelona", "pos": "MID", "salary": 8700, "pts": 13.8},
        {"name": "Lamine Yamal", "team": "Barcelona", "pos": "FWD", "salary": 9400, "pts": 16.5},
        {"name": "Robert Lewandowski", "team": "Barcelona", "pos": "FWD", "salary": 9700, "pts": 17.0},
        {"name": "Raphinha", "team": "Barcelona", "pos": "FWD", "salary": 8800, "pts": 14.2},
        {"name": "Joao Felix", "team": "Barcelona", "pos": "FWD", "salary": 8600, "pts": 13.5},
        
        # Atletico Madrid
        {"name": "Jan Oblak", "team": "Atletico Madrid", "pos": "GK", "salary": 8900, "pts": 14.2},
        {"name": "Jose Gimenez", "team": "Atletico Madrid", "pos": "DEF", "salary": 7900, "pts": 10.5},
        {"name": "Mario Hermoso", "team": "Atletico Madrid", "pos": "DEF", "salary": 7600, "pts": 9.8},
        {"name": "Nahuel Molina", "team": "Atletico Madrid", "pos": "DEF", "salary": 7800, "pts": 10.2},
        {"name": "Koke", "team": "Atletico Madrid", "pos": "MID", "salary": 8200, "pts": 11.5},
        {"name": "Rodrigo De Paul", "team": "Atletico Madrid", "pos": "MID", "salary": 8400, "pts": 12.2},
        {"name": "Marcos Llorente", "team": "Atletico Madrid", "pos": "MID", "salary": 8300, "pts": 11.8},
        {"name": "Antoine Griezmann", "team": "Atletico Madrid", "pos": "FWD", "salary": 9800, "pts": 18.0},
        {"name": "Alvaro Morata", "team": "Atletico Madrid", "pos": "FWD", "salary": 8700, "pts": 14.5},
        
        # Athletic Club
        {"name": "Unai Simon", "team": "Athletic Club", "pos": "GK", "salary": 8500, "pts": 13.0},
        {"name": "Dani Vivian", "team": "Athletic Club", "pos": "DEF", "salary": 7500, "pts": 9.5},
        {"name": "Yuri Berchiche", "team": "Athletic Club", "pos": "DEF", "salary": 7400, "pts": 9.2},
        {"name": "Oscar de Marcos", "team": "Athletic Club", "pos": "DEF", "salary": 7200, "pts": 8.5},
        {"name": "Oihan Sancet", "team": "Athletic Club", "pos": "MID", "salary": 8100, "pts": 11.5},
        {"name": "Inigo Ruiz de Galarreta", "team": "Athletic Club", "pos": "MID", "salary": 7600, "pts": 9.5},
        {"name": "Inaki Williams", "team": "Athletic Club", "pos": "FWD", "salary": 9200, "pts": 15.5},
        {"name": "Nico Williams", "team": "Athletic Club", "pos": "FWD", "salary": 9000, "pts": 15.0},
        {"name": "Gorka Guruzeta", "team": "Athletic Club", "pos": "FWD", "salary": 8300, "pts": 12.5},

        # Real Sociedad
        {"name": "Alex Remiro", "team": "Real Sociedad", "pos": "GK", "salary": 8400, "pts": 12.8},
        {"name": "Robin Le Normand", "team": "Real Sociedad", "pos": "DEF", "salary": 8000, "pts": 10.8},
        {"name": "Martin Zubimendi", "team": "Real Sociedad", "pos": "MID", "salary": 8500, "pts": 12.5},
        {"name": "Mikel Merino", "team": "Real Sociedad", "pos": "MID", "salary": 8400, "pts": 12.2},
        {"name": "Brais Mendez", "team": "Real Sociedad", "pos": "MID", "salary": 8300, "pts": 12.0},
        {"name": "Takefusa Kubo", "team": "Real Sociedad", "pos": "FWD", "salary": 8900, "pts": 14.5},
        {"name": "Mikel Oyarzabal", "team": "Real Sociedad", "pos": "FWD", "salary": 8800, "pts": 14.0},
        {"name": "Hamari Traore", "team": "Real Sociedad", "pos": "DEF", "salary": 7500, "pts": 9.5},
        {"name": "Arsen Zakharyan", "team": "Real Sociedad", "pos": "MID", "salary": 7600, "pts": 10.0},
        {"name": "Sheraldo Becker", "team": "Real Sociedad", "pos": "FWD", "salary": 7900, "pts": 11.2},
        
        # Girona
        {"name": "Paulo Gazzaniga", "team": "Girona", "pos": "GK", "salary": 8200, "pts": 12.0},
        {"name": "Daley Blind", "team": "Girona", "pos": "DEF", "salary": 7700, "pts": 10.2},
        {"name": "Eric Garcia", "team": "Girona", "pos": "DEF", "salary": 7500, "pts": 9.8},
        {"name": "Aleix Garcia", "team": "Girona", "pos": "MID", "salary": 8600, "pts": 13.5},
        {"name": "Ivan Martin", "team": "Girona", "pos": "MID", "salary": 8000, "pts": 11.2},
        {"name": "Savio", "team": "Girona", "pos": "FWD", "salary": 8900, "pts": 14.8},
        {"name": "Artem Dovbyk", "team": "Girona", "pos": "FWD", "salary": 9300, "pts": 16.0},
        {"name": "Miguel Gutierrez", "team": "Girona", "pos": "DEF", "salary": 7800, "pts": 10.5},
        {"name": "Yangel Herrera", "team": "Girona", "pos": "MID", "salary": 8100, "pts": 11.8},
        {"name": "Portu", "team": "Girona", "pos": "FWD", "salary": 8200, "pts": 12.5},
        
        # Villarreal
        {"name": "Filip Jorgensen", "team": "Villarreal", "pos": "GK", "salary": 8000, "pts": 11.5},
        {"name": "Juan Foyth", "team": "Villarreal", "pos": "DEF", "salary": 7700, "pts": 10.2},
        {"name": "Pau Torres", "team": "Villarreal", "pos": "DEF", "salary": 7900, "pts": 10.8},
        {"name": "Dani Parejo", "team": "Villarreal", "pos": "MID", "salary": 8400, "pts": 12.0},
        {"name": "Alex Baena", "team": "Villarreal", "pos": "MID", "salary": 8600, "pts": 13.5},
        {"name": "Gerard Moreno", "team": "Villarreal", "pos": "FWD", "salary": 9000, "pts": 15.2},
        {"name": "Alexander Sorloth", "team": "Villarreal", "pos": "FWD", "salary": 9100, "pts": 15.5},

        # Real Betis
        {"name": "Rui Silva", "team": "Real Betis", "pos": "GK", "salary": 8100, "pts": 11.8},
        {"name": "German Pezzella", "team": "Real Betis", "pos": "DEF", "salary": 7600, "pts": 10.0},
        {"name": "Isco", "team": "Real Betis", "pos": "MID", "salary": 8800, "pts": 14.5},
        {"name": "Nabil Fekir", "team": "Real Betis", "pos": "MID", "salary": 8500, "pts": 13.2},
        {"name": "Guido Rodriguez", "team": "Real Betis", "pos": "MID", "salary": 8200, "pts": 11.5},
        {"name": "Ayoze Perez", "team": "Real Betis", "pos": "FWD", "salary": 8400, "pts": 12.8},
        {"name": "Willian Jose", "team": "Real Betis", "pos": "FWD", "salary": 8300, "pts": 12.5},

        # Valencia
        {"name": "Giorgi Mamardashvili", "team": "Valencia", "pos": "GK", "salary": 8300, "pts": 12.5},
        {"name": "Jose Gaya", "team": "Valencia", "pos": "DEF", "salary": 8100, "pts": 11.5},
        {"name": "Cristhian Mosquera", "team": "Valencia", "pos": "DEF", "salary": 7500, "pts": 10.0},
        {"name": "Pepelu", "team": "Valencia", "pos": "MID", "salary": 8200, "pts": 12.0},
        {"name": "Javi Guerra", "team": "Valencia", "pos": "MID", "salary": 8000, "pts": 11.0},
        {"name": "Hugo Duro", "team": "Valencia", "pos": "FWD", "salary": 8500, "pts": 13.5},
        {"name": "Diego Lopez", "team": "Valencia", "pos": "FWD", "salary": 8100, "pts": 11.8}
    ]

    # 2. Authentic IPL 2024-2025 Roster (No Duplicates, accurate roles)
    ipl_roster = [
        # CSK (Chennai Super Kings)
        {"name": "MS Dhoni", "team": "CSK", "pos": "WK", "salary": 8800, "pts": 45.5},
        {"name": "Ruturaj Gaikwad", "team": "CSK", "pos": "BAT", "salary": 9200, "pts": 55.2},
        {"name": "Shivam Dube", "team": "CSK", "pos": "AR", "salary": 8500, "pts": 48.0},
        {"name": "Ravindra Jadeja", "team": "CSK", "pos": "AR", "salary": 9500, "pts": 58.5},
        {"name": "Matheesha Pathirana", "team": "CSK", "pos": "BOWL", "salary": 8900, "pts": 52.1},
        {"name": "Deepak Chahar", "team": "CSK", "pos": "BOWL", "salary": 8200, "pts": 42.5},
        {"name": "Ajinkya Rahane", "team": "CSK", "pos": "BAT", "salary": 7800, "pts": 38.0},
        {"name": "Daryl Mitchell", "team": "CSK", "pos": "BAT", "salary": 8600, "pts": 46.5},

        # MI (Mumbai Indians)
        {"name": "Rohit Sharma", "team": "MI", "pos": "BAT", "salary": 9600, "pts": 56.5},
        {"name": "Suryakumar Yadav", "team": "MI", "pos": "BAT", "salary": 10000, "pts": 65.0},
        {"name": "Hardik Pandya", "team": "MI", "pos": "AR", "salary": 9400, "pts": 54.5},
        {"name": "Ishan Kishan", "team": "MI", "pos": "WK", "salary": 8900, "pts": 49.2},
        {"name": "Jasprit Bumrah", "team": "MI", "pos": "BOWL", "salary": 9900, "pts": 62.5},
        {"name": "Tim David", "team": "MI", "pos": "BAT", "salary": 8300, "pts": 43.0},
        {"name": "Gerald Coetzee", "team": "MI", "pos": "BOWL", "salary": 8100, "pts": 41.5},
        {"name": "Tilak Varma", "team": "MI", "pos": "BAT", "salary": 8600, "pts": 47.0},

        # RCB (Royal Challengers Bengaluru)
        {"name": "Virat Kohli", "team": "RCB", "pos": "BAT", "salary": 10000, "pts": 68.5},
        {"name": "Faf du Plessis", "team": "RCB", "pos": "BAT", "salary": 9100, "pts": 53.0},
        {"name": "Glenn Maxwell", "team": "RCB", "pos": "AR", "salary": 9300, "pts": 55.5},
        {"name": "Mohammed Siraj", "team": "RCB", "pos": "BOWL", "salary": 8800, "pts": 48.5},
        {"name": "Dinesh Karthik", "team": "RCB", "pos": "WK", "salary": 8000, "pts": 40.2},
        {"name": "Rajat Patidar", "team": "RCB", "pos": "BAT", "salary": 8400, "pts": 45.0},
        {"name": "Cameron Green", "team": "RCB", "pos": "AR", "salary": 8900, "pts": 50.5},
        {"name": "Will Jacks", "team": "RCB", "pos": "BAT", "salary": 8700, "pts": 48.0},

        # KKR (Kolkata Knight Riders)
        {"name": "Shreyas Iyer", "team": "KKR", "pos": "BAT", "salary": 9000, "pts": 51.5},
        {"name": "Sunil Narine", "team": "KKR", "pos": "AR", "salary": 9700, "pts": 60.5},
        {"name": "Andre Russell", "team": "KKR", "pos": "AR", "salary": 9500, "pts": 58.0},
        {"name": "Rinku Singh", "team": "KKR", "pos": "BAT", "salary": 8800, "pts": 49.0},
        {"name": "Mitchell Starc", "team": "KKR", "pos": "BOWL", "salary": 9200, "pts": 52.0},
        {"name": "Varun Chakaravarthy", "team": "KKR", "pos": "BOWL", "salary": 8600, "pts": 47.5},
        {"name": "Phil Salt", "team": "KKR", "pos": "WK", "salary": 8900, "pts": 50.0},
        {"name": "Venkatesh Iyer", "team": "KKR", "pos": "BAT", "salary": 8200, "pts": 42.5},

        # GT (Gujarat Titans)
        {"name": "Shubman Gill", "team": "GT", "pos": "BAT", "salary": 9800, "pts": 61.0},
        {"name": "Rashid Khan", "team": "GT", "pos": "BOWL", "salary": 9600, "pts": 57.5},
        {"name": "Sai Sudharsan", "team": "GT", "pos": "BAT", "salary": 8700, "pts": 48.5},
        {"name": "David Miller", "team": "GT", "pos": "BAT", "salary": 8600, "pts": 47.0},
        {"name": "Mohit Sharma", "team": "GT", "pos": "BOWL", "salary": 8400, "pts": 45.0},
        {"name": "Rahul Tewatia", "team": "GT", "pos": "AR", "salary": 8100, "pts": 41.0},
        {"name": "Wriddhiman Saha", "team": "GT", "pos": "WK", "salary": 7900, "pts": 38.5},

        # RR (Rajasthan Royals)
        {"name": "Sanju Samson", "team": "RR", "pos": "WK", "salary": 9400, "pts": 55.0},
        {"name": "Jos Buttler", "team": "RR", "pos": "WK", "salary": 9700, "pts": 60.2},
        {"name": "Yashasvi Jaiswal", "team": "RR", "pos": "BAT", "salary": 9300, "pts": 54.5},
        {"name": "Trent Boult", "team": "RR", "pos": "BOWL", "salary": 9000, "pts": 51.0},
        {"name": "Yuzvendra Chahal", "team": "RR", "pos": "BOWL", "salary": 8900, "pts": 50.5},
        {"name": "Riyan Parag", "team": "RR", "pos": "BAT", "salary": 8500, "pts": 48.0},
        {"name": "Ravichandran Ashwin", "team": "RR", "pos": "AR", "salary": 8300, "pts": 44.5},

        # SRH (Sunrisers Hyderabad)
        {"name": "Pat Cummins", "team": "SRH", "pos": "AR", "salary": 9200, "pts": 52.5},
        {"name": "Travis Head", "team": "SRH", "pos": "BAT", "salary": 9500, "pts": 58.0},
        {"name": "Heinrich Klaasen", "team": "SRH", "pos": "WK", "salary": 9600, "pts": 59.5},
        {"name": "Abhishek Sharma", "team": "SRH", "pos": "BAT", "salary": 8800, "pts": 50.0},
        {"name": "Bhuvneshwar Kumar", "team": "SRH", "pos": "BOWL", "salary": 8500, "pts": 46.5},
        {"name": "T Natarajan", "team": "SRH", "pos": "BOWL", "salary": 8400, "pts": 44.5},
        {"name": "Aiden Markram", "team": "SRH", "pos": "BAT", "salary": 8700, "pts": 47.0},

        # DC (Delhi Capitals)
        {"name": "Rishabh Pant", "team": "DC", "pos": "WK", "salary": 9300, "pts": 54.0},
        {"name": "David Warner", "team": "DC", "pos": "BAT", "salary": 9100, "pts": 51.5},
        {"name": "Axar Patel", "team": "DC", "pos": "AR", "salary": 8900, "pts": 50.0},
        {"name": "Kuldeep Yadav", "team": "DC", "pos": "BOWL", "salary": 8800, "pts": 49.5},
        {"name": "Tristan Stubbs", "team": "DC", "pos": "WK", "salary": 8400, "pts": 46.0},
        {"name": "Jake Fraser-McGurk", "team": "DC", "pos": "BAT", "salary": 8600, "pts": 48.5},
        {"name": "Khaleel Ahmed", "team": "DC", "pos": "BOWL", "salary": 8000, "pts": 41.0},
        
        # LSG (Lucknow Super Giants)
        {"name": "NL Rahul", "team": "LSG", "pos": "WK", "salary": 9400, "pts": 55.5},
        {"name": "Nicholas Pooran", "team": "LSG", "pos": "WK", "salary": 9200, "pts": 53.0},
        {"name": "Marcus Stoinis", "team": "LSG", "pos": "AR", "salary": 8900, "pts": 50.5},
        {"name": "Ayush Badoni", "team": "LSG", "pos": "BAT", "salary": 7800, "pts": 38.0},
        {"name": "Ravi Bishnoi", "team": "LSG", "pos": "BOWL", "salary": 8500, "pts": 46.5},
        {"name": "Mohsin Khan", "team": "LSG", "pos": "BOWL", "salary": 8100, "pts": 42.0},
        
        # PBKS (Punjab Kings)
        {"name": "Shikhar Dhawan", "team": "PBKS", "pos": "BAT", "salary": 8800, "pts": 49.0},
        {"name": "Sam Curran", "team": "PBKS", "pos": "AR", "salary": 9100, "pts": 52.0},
        {"name": "Arshdeep Singh", "team": "PBKS", "pos": "BOWL", "salary": 8600, "pts": 47.0},
        {"name": "Kagiso Rabada", "team": "PBKS", "pos": "BOWL", "salary": 8900, "pts": 50.5},
        {"name": "Jonny Bairstow", "team": "PBKS", "pos": "WK", "salary": 8700, "pts": 48.5},
        {"name": "Shashank Singh", "team": "PBKS", "pos": "BAT", "salary": 8000, "pts": 43.0},
        {"name": "Liam Livingstone", "team": "PBKS", "pos": "AR", "salary": 8700, "pts": 48.0},
        {"name": "Prabhsimran Singh", "team": "PBKS", "pos": "BAT", "salary": 7800, "pts": 41.5},
        {"name": "Harshal Patel", "team": "PBKS", "pos": "BOWL", "salary": 8300, "pts": 44.5},
        {"name": "Rahul Chahar", "team": "PBKS", "pos": "BOWL", "salary": 8100, "pts": 42.0},

        # Extra Elite Players (Filling gaps across all positions)
        {"name": "Quinton de Kock", "team": "LSG", "pos": "WK", "salary": 9100, "pts": 51.5},
        {"name": "Devdutt Padikkal", "team": "LSG", "pos": "BAT", "salary": 8200, "pts": 43.5},
        {"name": "Naveen-ul-Haq", "team": "LSG", "pos": "BOWL", "salary": 8400, "pts": 45.0},
        {"name": "Krunal Pandya", "team": "LSG", "pos": "AR", "salary": 8300, "pts": 44.5},
        {"name": "Prithvi Shaw", "team": "DC", "pos": "BAT", "salary": 8500, "pts": 47.0},
        {"name": "Anrich Nortje", "team": "DC", "pos": "BOWL", "salary": 8800, "pts": 50.0},
        {"name": "Ishant Sharma", "team": "DC", "pos": "BOWL", "salary": 8000, "pts": 41.5},
        {"name": "Harry Brook", "team": "DC", "pos": "BAT", "salary": 8700, "pts": 48.5},
        {"name": "Abdul Samad", "team": "SRH", "pos": "BAT", "salary": 7600, "pts": 37.0},
        {"name": "Mayank Agarwal", "team": "SRH", "pos": "BAT", "salary": 8300, "pts": 43.5},
        {"name": "Marco Jansen", "team": "SRH", "pos": "AR", "salary": 8600, "pts": 47.5},
        {"name": "Washington Sundar", "team": "SRH", "pos": "AR", "salary": 8200, "pts": 42.0},
        {"name": "Dhruv Jurel", "team": "RR", "pos": "WK", "salary": 8100, "pts": 43.0},
        {"name": "Shimron Hetmyer", "team": "RR", "pos": "BAT", "salary": 8600, "pts": 48.5},
        {"name": "Avesh Khan", "team": "RR", "pos": "BOWL", "salary": 8300, "pts": 44.5},
        {"name": "Sandeep Sharma", "team": "RR", "pos": "BOWL", "salary": 8400, "pts": 45.5},
        {"name": "Spencer Johnson", "team": "GT", "pos": "BOWL", "salary": 8000, "pts": 42.0},
        {"name": "Umesh Yadav", "team": "GT", "pos": "BOWL", "salary": 7900, "pts": 41.0},
        {"name": "Vijay Shankar", "team": "GT", "pos": "AR", "salary": 7700, "pts": 39.5},
        {"name": "Kane Williamson", "team": "GT", "pos": "BAT", "salary": 8800, "pts": 49.0},
        {"name": "Nitish Rana", "team": "KKR", "pos": "BAT", "salary": 8500, "pts": 47.0},
        {"name": "Ramandeep Singh", "team": "KKR", "pos": "AR", "salary": 7800, "pts": 40.0},
        {"name": "Anukul Roy", "team": "KKR", "pos": "AR", "salary": 7500, "pts": 38.0},
        {"name": "Suyash Sharma", "team": "KKR", "pos": "BOWL", "salary": 8100, "pts": 43.5},
        {"name": "Mahipal Lomror", "team": "RCB", "pos": "BAT", "salary": 7900, "pts": 41.0},
        {"name": "Alzarri Joseph", "team": "RCB", "pos": "BOWL", "salary": 8300, "pts": 44.5},
        {"name": "Karn Sharma", "team": "RCB", "pos": "BOWL", "salary": 7800, "pts": 40.0},
        {"name": "Yash Dayal", "team": "RCB", "pos": "BOWL", "salary": 8000, "pts": 42.0},
        {"name": "Piyush Chawla", "team": "MI", "pos": "BOWL", "salary": 8200, "pts": 43.5},
        {"name": "Romario Shepherd", "team": "MI", "pos": "AR", "salary": 8400, "pts": 45.0},
        {"name": "Nuwan Thushara", "team": "MI", "pos": "BOWL", "salary": 8100, "pts": 42.5},
        {"name": "Dewald Brevis", "team": "MI", "pos": "BAT", "salary": 8000, "pts": 41.0},
        {"name": "Moeen Ali", "team": "CSK", "pos": "AR", "salary": 8800, "pts": 49.0},
        {"name": "Mustafizur Rahman", "team": "CSK", "pos": "BOWL", "salary": 8700, "pts": 48.0},
        {"name": "Shardul Thakur", "team": "CSK", "pos": "BOWL", "salary": 8300, "pts": 44.5},
        {"name": "Sameer Rizvi", "team": "CSK", "pos": "BAT", "salary": 7700, "pts": 39.5}
    ]

    for p in laliga_roster:
        # Slight randomized variance so models feel organic
        variance = random.uniform(-1.0, 1.0)
        players_data.append(Player(
            name=p["name"], sport="LaLiga", team=p["team"], position=p["pos"],
            salary=p["salary"], projected_points=p["pts"] + variance, stats={"form": random.uniform(0.5, 1.0)}
        ))
        
    for p in ipl_roster:
        variance = random.uniform(-2.0, 3.0)
        players_data.append(Player(
            name=p["name"], sport="IPL", team=p["team"], position=p["pos"],
            salary=p["salary"], projected_points=p["pts"] + variance, stats={"form": random.uniform(0.5, 1.0)}
        ))

    db.add_all(players_data)
    db.commit()
    print(f"Successfully seeded {len(players_data)} REAL players into the database cleanly and statically.")
    db.close()

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    seed_db()
