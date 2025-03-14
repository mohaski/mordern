const checkinsSchema = `
CREATE TABLE IF NOT EXISTS checkins (
    checkin_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INTEGER NOT NULL,
    county VARCHAR(100) NOT NULL, -- County where the driver checked in
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(user_id)
);
`;