const parcelsSchema = `
CREATE TABLE IF NOT EXISTS parcels (
    parcel_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    content VARCHAR(255) NOT NULL,
    weight DECIMAL(10, 2) NOT NULL,
    number_of_pieces INT NOT NULL,
    payment_amount DECIMAL(10, 2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
    
);

`
module.exports = parcelsSchema;

//     order_id INT NOT NULL,
//    FOREIGN KEY (order_id) REFERENCES orders(order_id)

