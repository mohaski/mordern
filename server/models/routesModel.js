const routesSchema = `
CREATE TABLE IF NOT EXISTS routes (
    route_id INT AUTO_INCREMENT PRIMARY KEY,
    route_name VARCHAR(50) NOT NULL, -- "Route 1" or "Route 2"
    direction ENUM('forward', 'reverse') NOT NULL,
    sequence_order JSON NOT NULL -- Ordered list of counties (e.g., ["Mombasa", "Voi", "Nairobi"])
);
`