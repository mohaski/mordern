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
  const sender = req.session.sender;
  const receiver = req.session.receiver;
  const parcels = req.session.parcels;
  const total_cost = req.session.total_cost;

  // Validate sender and receiver data
  if (!sender || !receiver || ! total_cost) {
    return res.status(400).json({ error: "Sender,receiver or total cost details are missing in session" });
  };

  try {
     // Query routes to find a valid route/direction for the counties
     const [routes] = await db.query(
      `
      SELECT route_id, direction, sequence_order 
      FROM routes 
      WHERE 
        JSON_CONTAINS(sequence_order, ?) 
        AND JSON_CONTAINS(sequence_order, ?)
      `,
      [JSON.stringify(sender.county), JSON.stringify(receiver.county)]
     );
      console.log(routes);

      let validRoute = []; // Store the selected route

      // Loop through routes to find the correct one
      for (const route of routes) {
        const sequence = route.sequence_order; // Use existing sequence_order
      
        const senderIndex = sequence.indexOf(sender.county);
        const receiverIndex = sequence.indexOf(receiver.county);
      
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

    // Assign route_id and direction to the order
    const order = {
      route_id: selectedRoute.route_id,
      direction: selectedRoute.direction,
      current_county_office: sender.county,
      senderName: sender.name,
      senderEmail: sender.email,
      senderPhone_number: sender.phone_number,
      pickupCounty: sender.county,
      pickupbuilding_name: sender.building_name,
      pickupnearest_landmark: sender.nearest_landmark,
      receiverName: receiver.name,
      receiverEmail: receiver.email,
      receiverPhone_number: receiver.phone_number,
      deliverCounty: receiver.county,
      delivery_street_name: receiver.street_name,
      delivery_building_name: receiver.building_name,
      delivery_nearest_landmark: receiver.nearest_landmark,
      status: 'waiting transit',
      total_cost: total_cost
    };

    // Insert the order into the database
    const [result] = await db.query("INSERT INTO tempOrders SET ?", [order]);

    if (result.affectedRows === 1) {
      res.status(201).json({ message: "Order created successfully", order });
    } else {
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
    res.status(200).json({message: 'order and parcel added successfully'})
  } catch (err) {
    console.error("Error in orderCreation:", err);
    return res.status(500).json({ error: err.message });
  }
};


module.exports = {
walk_inSenderDetails,
walk_inReceiverDetails,
walk_inparcelDetails,
walk_inOrderCreation
}