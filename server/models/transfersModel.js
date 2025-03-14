const transfersSchema = `
CREATE TABLE IF NOT EXISTS transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    transit_driver_id VARCHAR(255) NOT NULL,
    from_county VARCHAR(100) NOT NULL, -- Origin county
    to_county VARCHAR(100) NOT NULL, -- Destination county
    pickup_time TIMESTAMP,
    dropoff_time TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (transit_driver_id) REFERENCES users(user_id)
);
`