const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);
const validateSender_ReceiverFields = require("../utils/validateSender_ReceiverFields");


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
  const senderjson = JSON.parse(sender);
  const receiverjson = JSON.parse(receiver);
 
  console.log(total_cost);
  console.log(sender);
  console.log(receiver);

  // Validate sender and receiver data
  if (!sender || !receiver || total_cost < 0 ) {
    return res.status(400).json({ error: "Sender,receiver or total cost details are missing in session" });
  };

  try {
     // Query routes to find a valid route/direction for the counties
     const [routes] = await db.query(
      `
      SELECT route_id, direction, sequence_order 
      FROM routes 
      WHERE 
        JSON_CONTAINS(sequence_order, JSON_QUOTE(?)) 
        AND JSON_CONTAINS(sequence_order, JSON_QUOTE(?))

      `,
      [county, receiverjson.county]
     );
      console.log(county);
      console.log(receiverjson.county);

      let validRoute = []; // Store the selected route

      // Loop through routes to find the correct one
      for (const route of routes) {
        const sequence = route.sequence_order; // Use existing sequence_order
      
        const senderIndex = sequence.indexOf(county);
        const receiverIndex = sequence.indexOf(receiverjson.county);
      
        if (senderIndex !== -1 && receiverIndex !== -1) {
          if (senderIndex < receiverIndex && route.direction === 'forward') {
            validRoute.push(route); // Choose Route 1 for forward trips
            break;
          } else if (senderIndex > receiverIndex && route.direction === 'reverse') {
            validRoute.push(route); // Choose Route 2 for reverse trips
            break;
          }
        }
      }
      
      // Output the selected route
      console.log(validRoute);

     

   if (validRoute.length === 0) {
      throw new Error('No valid route found for the given counties and direction');
   }

   // Use the first valid route (or let the user choose)
   const selectedRoute = validRoute[0];

   console.log(selectedRoute);

    // Assign route_id and direction to the order
    const order = {
      route_id: selectedRoute.route_id,
      direction: selectedRoute.direction,
      current_county_office: `${county} office`,
      senderName: senderjson.name,
      senderEmail: senderjson.email,
      senderPhone_number: senderjson.phone_number,
      pickupCounty: county,
      pickupbuilding_name:`${county} office`,
      receiverName: receiverjson.name,
      receiverEmail: receiverjson.email,
      receiverPhone_number: receiverjson.phone_number,
      deliverCounty: receiverjson.county,
      delivery_street_name: receiverjson.street_name,
      delivery_building_name: receiverjson.building_name,
      delivery_nearest_landmark: receiverjson.nearest_landmark,
      status: 'Awaiting Confirmation',
      total_cost: total_cost
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
    await db.query(`
      UPDATE temporders
      SET payment_mode = ?, status= ?
      WHERE order_id = ?;
      `,
    [payment_mode, 'Waiting Transit', order_id]);

    return res.status(200).json({message: 'The order is confirmed'})
  }catch(error){
    return res.status(500).json({error: error.message});
  }
}


module.exports = {
walk_inSenderDetails,
walk_inReceiverDetails,
walk_inparcelDetails,
walk_inOrderCreation,
orderManagerConfirmOrder
}