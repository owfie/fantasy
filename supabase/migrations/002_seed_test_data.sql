-- Seed Test Data from test-players.json
-- Run this after 001_initial_schema.sql

-- Insert teams
INSERT INTO teams (name) VALUES 
  ('Force'),
  ('Flyers'),
  ('Riptide'),
  ('Titans')
ON CONFLICT (name) DO NOTHING;

-- Insert players for Force
INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Andy', 'Badics', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Brayan', 'Ordonez', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Daniel', 'Roberts', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Joseph', 'Petrie', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Lachlan', 'Eichner', 'captain'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Rudra', 'Patil', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Sam', 'Caon', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Sol', 'Gunson', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Ted', 'Wachtel', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Tim', 'Davis', 'player'
FROM teams t WHERE t.name = 'Force'
ON CONFLICT DO NOTHING;

-- Insert players for Flyers
INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Alec', 'Lyttle', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Daniel', 'Bamford Clark', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Ferdy', 'Rahmadhan', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Hamish', 'Mitchell', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Harry', 'Buckland', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Jonathon', 'Warren-White', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Keith', 'Chau', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Luke', 'Meyer', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Martyn Mazar', 'Tonkin', 'player'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Oscar', 'Turnbull', 'captain'
FROM teams t WHERE t.name = 'Flyers'
ON CONFLICT DO NOTHING;

-- Insert players for Riptide
INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Ben', 'Foley', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Jack', 'Donaldson', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Jairo Enrique Chisabo', 'Garcia', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'James', 'Guerin', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'John', 'Perkins', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Jono', 'Brill', 'captain'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Jordan', 'Thein', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Matthew', 'Gordon', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Richard', 'Appleby', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Ryan', 'Froud', 'player'
FROM teams t WHERE t.name = 'Riptide'
ON CONFLICT DO NOTHING;

-- Insert players for Titans
INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Ayden', 'Day', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Christoph', 'Hager', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Greg', 'Schrader', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Joel', 'Pillar-Rogers', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Kevin', 'Lozada', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Lachlan', 'Earl', 'captain'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Sam', 'Tonkin', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Scott', 'Swart', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Shantanu', 'Malhotra', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;

INSERT INTO players (team_id, first_name, last_name, player_role)
SELECT t.id, 'Siddharth', 'Srinivasan', 'player'
FROM teams t WHERE t.name = 'Titans'
ON CONFLICT DO NOTHING;


