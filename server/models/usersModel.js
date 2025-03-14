const userSchema = `
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('office manager', 'cashier', 'driver') NOT NULL,
    driver_type ENUM('county', 'transit') DEFAULT NULL,
    county VARCHAR(100) DEFAULT NULL, -- For county drivers, office managers, cashiers
    route_id INT DEFAULT NULL, -- For transit drivers (optional)
    current_direction ENUM('forward', 'reverse') DEFAULT NULL, -- For transit drivers
    is_first_login BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(route_id)
);
`;

module.exports = userSchema;
