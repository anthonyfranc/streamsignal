-- Create service_genres table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_genres (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES streaming_services(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  UNIQUE(service_id, genre)
);

-- Create service_devices table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_devices (
  id SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES streaming_services(id) ON DELETE CASCADE,
  device TEXT NOT NULL,
  UNIQUE(service_id, device)
);

-- Insert sample genres for Netflix (assuming service_id 1)
INSERT INTO service_genres (service_id, genre)
VALUES 
  (1, 'Movies'),
  (1, 'TV Shows'),
  (1, 'Documentaries'),
  (1, 'Kids')
ON CONFLICT (service_id, genre) DO NOTHING;

-- Insert sample genres for Disney+ (assuming service_id 2)
INSERT INTO service_genres (service_id, genre)
VALUES 
  (2, 'Movies'),
  (2, 'TV Shows'),
  (2, 'Kids'),
  (2, 'Animation')
ON CONFLICT (service_id, genre) DO NOTHING;

-- Insert sample genres for HBO Max (assuming service_id 3)
INSERT INTO service_genres (service_id, genre)
VALUES 
  (3, 'Movies'),
  (3, 'TV Shows'),
  (3, 'Documentaries'),
  (3, 'Originals')
ON CONFLICT (service_id, genre) DO NOTHING;

-- Insert sample devices for Netflix
INSERT INTO service_devices (service_id, device)
VALUES 
  (1, 'TV'),
  (1, 'Mobile'),
  (1, 'Tablet'),
  (1, 'Computer'),
  (1, 'Gaming Console')
ON CONFLICT (service_id, device) DO NOTHING;

-- Insert sample devices for Disney+
INSERT INTO service_devices (service_id, device)
VALUES 
  (2, 'TV'),
  (2, 'Mobile'),
  (2, 'Tablet'),
  (2, 'Computer'),
  (2, 'Gaming Console')
ON CONFLICT (service_id, device) DO NOTHING;

-- Insert sample devices for HBO Max
INSERT INTO service_devices (service_id, device)
VALUES 
  (3, 'TV'),
  (3, 'Mobile'),
  (3, 'Computer'),
  (3, 'Tablet')
ON CONFLICT (service_id, device) DO NOTHING;
