-- Migration for Expanded Artist Profile Fields (Soul Artists Clone)

ALTER TABLE acts
ADD COLUMN IF NOT EXISTS artist_type TEXT, -- e.g., Solo, Duo, Trio, Band
ADD COLUMN IF NOT EXISTS gender TEXT, -- e.g., Male, Female, Mixed
ADD COLUMN IF NOT EXISTS performance_type TEXT, -- e.g., Stage Show, Roaming, Ambient
ADD COLUMN IF NOT EXISTS genre TEXT, -- e.g., Jazz, Rock, House (can be specific to category)
ADD COLUMN IF NOT EXISTS location_base TEXT, -- e.g., Dubai, Abu Dhabi
ADD COLUMN IF NOT EXISTS willing_to_travel BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS travel_departure_city TEXT,
ADD COLUMN IF NOT EXISTS min_duration TEXT, -- e.g., 15 min
ADD COLUMN IF NOT EXISTS max_duration TEXT, -- e.g., 4 hours
ADD COLUMN IF NOT EXISTS set_count INTEGER, -- e.g., 3 sets
ADD COLUMN IF NOT EXISTS setup_time TEXT, -- e.g., 30 mins
ADD COLUMN IF NOT EXISTS members_count INTEGER DEFAULT 1;

-- Update existing rows with defaults if necessary
UPDATE acts SET artist_type = 'Solo' WHERE artist_type IS NULL;
UPDATE acts SET performance_type = 'Stage Show' WHERE performance_type IS NULL;
UPDATE acts SET location_base = 'Dubai' WHERE location_base IS NULL;
