const temp_ordersSchema = `
CREATE TABLE IF NOT EXISTS tempOrders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    SenderName VARCHAR(100) NOT NULL,
    SenderEmail VARCHAR(100) NOT NULL,
    SenderPhone_number VARCHAR(15) NOT NULL,
    pickupcounty VARCHAR(50) NOT NULL,
    pickupstreet_name VARCHAR(100) DEFAULT NULL ,
    pickupbuilding_name VARCHAR(100) NOT NULL,
    pickupnearest_landmark VARCHAR(100) DEFAULT NULL,
    total_cost DECIMAL(10, 2) DEFAULT NULL,
    customer_type ENUM('online', 'walk-in') NOT NULL DEFAULT 'online', 
    served_by VARCHAR(100) DEFAULT NULL,
    receiverName VARCHAR(100) NOT NULL,
    receiverEmail VARCHAR(100),
    receiverPhone_number VARCHAR(15) NOT NULL,
    deliverCounty VARCHAR(50) NOT NULL,
    delivery_street_name VARCHAR(100) NOT NULL,
    delivery_building_name VARCHAR(100) NOT NULL,
    delivery_nearest_landmark VARCHAR(100),
    status ENUM(
        'Pending Cost Calculation',
        'Awaiting Confirmation',
        'To Be Collected',
        'Collected',
        'Waiting Transit',
        'In Transit',
        'To Be Delivered',
        'in delivery'
        'Delivered'
    ) DEFAULT 'Pending Cost Calculation',
    tracking_number VARCHAR(20) UNIQUE DEFAULT NULL,
    current_county_office VARCHAR(100) NOT NULL, -- Current location of the parcel
    route_id INT NOT NULL, -- Route assigned to the parcel (Route 1 or 2)
    direction ENUM('forward', 'reverse') NOT NULL, -- Direction of the route
    assigned_county_driver_id INTEGER, -- County driver (from users.user_id)
    assigned_transit_driver_id INTEGER, -- Transit driver (from users.user_id)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(route_id),
    FOREIGN KEY (assigned_county_driver_id) REFERENCES users(user_id),
    FOREIGN KEY (assigned_transit_driver_id) REFERENCES users(user_id)
);
`
