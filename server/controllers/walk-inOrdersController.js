const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);
const validateSender_ReceiverFields = require("../utils/validateSender_ReceiverFields");
const uuid = require('uuid')

function add48HoursToNow() {
  const now = new Date(); // Current date and time
  const newDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Add 48 hours in milliseconds

  // Format to YYYY-MM-DD HH:MM:SS
  const year = newDate.getFullYear();
  const month = String(newDate.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const day = String(newDate.getDate()).padStart(2, '0');
  const hours = String(newDate.getHours()).padStart(2, '0');
  const minutes = String(newDate.getMinutes()).padStart(2, '0');
  const seconds = String(newDate.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


const generateTrackingNumber = async () => {
    return uuid.v4(); // Generates a unique ID like '550e8400-e29b-41d4-a716-446655440000'
}

// Example usage
const walk_inSenderDetails = async(req, res)=> {
  const county = req.user.county;
  const  building_name = `${req.user.county} office`;
  const served_by= req.user.email
  const customer_type = 'walk-in'
  const {name, email, phone_number } = req.body

  const validationErrors = validateSender_ReceiverFields({ name, email, phone_number});

  if (validationErrors.length > 0) {
      // Return validation errors to the client
      return res.status(400).json({ errors: validationErrors });
  }

  try{

  const sender = {
    name, email, phone_number, county, customer_type, building_name, served_by
  }

    // Store sender details in session
    req.session.sender = sender;
    console.log(sender);

    res.status(200).json({message: 'sender created added successfully in session'})
  }catch(error){
    res.status(500).json({error: error.message})
  }

}


const walk_inReceiverDetails = async (req, res)=> {
  const { name, email, phone_number, county, street_name, building_name, nearest_landmark} = req.body

  const validationErrors = validateSender_ReceiverFields({ name, email, phone_number, county, street_name, building_name, nearest_landmark});
  if(validationErrors.length > 0){
      return res.status(400).json({errors: validationErrors})
  }

  try{
      
      const receiver = { name, email, phone_number, county, street_name, building_name, nearest_landmark}
      // Store receiver details in session
      req.session.receiver = receiver;
      console.log(receiver);

      res.status(200).json({message: 'receiver created added successfully in session'})


  }catch(error){
      return res.status(500).json({error: error.message})
  }
}
  



const walk_inparcelDetails = async (req, res) => {
  try {
    const shipments = req.body;

    // Validate input
    if (!Array.isArray(shipments) || shipments.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array of shipments" });
    }

    const validationErrors = [];
    const parcels = [];
    let total_cost = 0;

    // Single loop for validation and processing
    for (const shipment of shipments) {
      const { content, weight, number_of_pieces, payment_amount } = shipment;

      // Validate fields
      if (!content || !weight || !number_of_pieces || !payment_amount) {
        validationErrors.push({
          shipment,
          message: "All fields (content, weight, number_of_pieces, amount) are required",
        });
        continue; // Skip invalid shipments
      }

      // Process valid shipments
      parcels.push({ content, weight, number_of_pieces, payment_amount });
      total_cost += payment_amount;
    }

    // Handle validation errors
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed for some shipments",
        errors: validationErrors,
      });
    }

    // Ensure session is initialized
    if (!req.session) {
      req.session = {};
    }

    // Update session
    req.session.total_cost = total_cost;
    req.session.parcels = parcels;

    // Send response
    res.status(200).json({
      success: true,
      message: "Parcels added successfully in session",
    });
  } catch (error) {
    console.error("Error in walk_inparcelDetails:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const walk_inOrderCreation = async (req, res) => {
  const {county, sender, receiver, parcels, total_cost} = req.body;
  //const {county} = req.user;
  const senderjson = JSON.parse(sender);
  const receiverjson = JSON.parse(receiver);

  console.log(senderjson)
 
 

  // Validate sender and receiver data
  if (!sender || !receiver || total_cost < 0 ) {
    return res.status(400).json({ error: "Sender,receiver or total cost details are missing in session" });
  };

  try {
     // Query routes to find a valid route/direction for the counties
     const [routes] = await db.query(
      `
     SELECT route_id, route_name, sequence_order
      FROM routes,
          JSON_TABLE(sequence_order, '$[*]' COLUMNS (county VARCHAR(255) PATH '$')) AS seq
      WHERE seq.county IN (?, ?)
      GROUP BY route_id
      HAVING COUNT(DISTINCT seq.county) = 2
      LIMIT 1;

      `,
      [county, receiverjson.county]
     );

      let direction;

      const senderIndex = routes[0].sequence_order.indexOf(county);
      const receiverIndex = routes[0].sequence_order.indexOf(receiverjson.county);
      
      if (senderIndex < receiverIndex) {
        direction = 'forward';
      } else if (senderIndex > receiverIndex) {
        direction = 'reverse'
      }

      let validRoute = []; // Store the selected route
      
      validRoute.push(routes[0]);
        

   if (validRoute.length === 0) {
      throw new Error('No valid route found for the given counties and direction');
   }

   // Use the first valid route (or let the user choose)
   const selectedRoute = validRoute[0];

    // Assign route_id and direction to the order
    const order = {
      route_id: selectedRoute.route_id,
      direction: direction,
      current_county_office: county,
      senderName: senderjson.name,
      senderEmail: senderjson.email,
      senderPhone_number: senderjson.phone_number,
      pickupCounty: county,
      pickupstreet_name: `${county} office`,
      pickupbuilding_name:`${county} office`,
      receiverName: receiverjson.name,
      receiverEmail: receiverjson.email,
      receiverPhone_number: receiverjson.phone_number,
      deliverCounty: receiverjson.county,
      delivery_street_name: receiverjson.street_name,
      delivery_building_name: receiverjson.building_name,
      delivery_nearest_landmark: receiverjson.nearest_landmark,
      status: 'Awaiting Confirmation',
      total_cost: total_cost,
      estimated_delivery: add48HoursToNow()
    };

    // Insert the order into the database
    const [result] = await db.query("INSERT INTO tempOrders SET ?", [order]);

    if (result.affectedRows !== 1) {
      return res.status(500).json({ error: "Failed to create order" });   
    } 
    if (parcels.length === 0) {
      throw new Error("No parcels provided for the order");
    }
  
    const parcelData = parcels.map((parcel) => ({
      order_id: result.insertId,
      content: parcel.content,
      weight: parcel.weight,
      number_of_pieces: parcel.number_of_pieces,
      payment_amount: parcel.payment_amount
    }));
  
    // Use bulk insert for better performance
    await db.query("INSERT INTO parcels (order_id, content, weight, number_of_pieces, payment_amount) VALUES ?", [
    parcelData.map((parcel) => [parcel.order_id, parcel.content, parcel.weight, parcel.number_of_pieces, parcel.payment_amount]),
    ]);
    return res.status(200).json({
      message: 'order and parcel added successfully',
      order_id : result.insertId
    })
  } catch (err) {
    console.error("Error in orderCreation:", err);
    return res.status(500).json({ error: err.message });
  }
};

const orderManagerConfirmOrder = async (req, res) => {
  const {order_id, payment_mode} = req.body;

  if(!order_id || !payment_mode){
    return res.status(400).json({message: 'order_id or payment_mode cannot be null'})
  }

  try{

    const trackingNumber = await generateTrackingNumber();

    await db.query(`
      UPDATE temporders
      SET payment_mode = ?, status= ?, tracking_number = ?, payment_time = ?
      WHERE order_id = ?;
      `,
    [payment_mode, 'Waiting Transit', trackingNumber, 'on-pickup', order_id]);

    return res.status(200).json({message: 'The order is confirmed'})
  }catch(error){
    return res.status(500).json({error: error.message});
  }
}

const getorderManagerOrders = async(req, res) => {
  const {county} = req.params;
  console.log(county)
  if(!county ) return res.status(400).json({message: 'user_id must be provided'});

  try{
    const [orders] = await db.query(`SELECT * FROM temporders WHERE pickupcounty = ? ;`, [county]);
    
    return res.status(200).json({
      message: `all orders for ${county} office are retrieved`,
      orders
    })
  }catch(error){
    return res.status(500).json({error: error.message});
  }
}


module.exports = {
walk_inSenderDetails,
walk_inReceiverDetails,
walk_inparcelDetails,
walk_inOrderCreation,
orderManagerConfirmOrder,
getorderManagerOrders
}