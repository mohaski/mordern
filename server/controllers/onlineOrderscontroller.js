const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);


const validateSender_ReceiverFields = require("../utils/validateSender_ReceiverFields");
const uuid = require("uuid");

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

// Example usage
console.log(add48HoursToNow()); // e.g., "2025-03-25 14:30:45" (48 hours from now)

const generateTrackingNumber = async () => {
    return uuid.v4(); // Generates a unique ID like '550e8400-e29b-41d4-a716-446655440000'
}

// Import correction (should be require instead of import for CommonJS)
require('dotenv').config(); // Load environment variables from .env file

// Looking to send emails in production? Check out our Email API/SMTP product!
const nodemailer = require("nodemailer");
const { MailtrapClient } = require("mailtrap");

const TOKEN = "47549598efe2da0d422d7958af67cf69";

const sendEmail = (senderEmail,senderName, recipientsEmail) => {
  const client = new MailtrapClient({ token: TOKEN });

  const sender = { name: senderName, email: senderEmail };

  client
    .send({
      from: sender,
      to: [{ email: recipientsEmail }],
      subject: "Hello from Mailtrap!",
      text: "Welcome to Mailtrap Sending!",
    })
    .then(console.log)
    .catch(console.error);
};





const senderDetails = async(req, res)=> {
  const {name, email, phone_number, county, street_name, building_name, nearest_landmark} = req.body

  const validationErrors = validateSender_ReceiverFields({ name, email, phone_number, county, street_name, building_name, nearest_landmark });

  if (validationErrors.length > 0) {
      // Return validation errors to the client
      return res.status(400).json({ errors: validationErrors });
  }

  try{

     // Ensure session is initialized
    if (!req.session) {
      return res.status(500).json({ error: "Session not initialized" });
    }
    const sender = {
      name, email, phone_number, county, street_name, building_name, nearest_landmark
    };

    // Store sender details in session
    //req.session.sender = sender;
    //console.log(sender);

    res.status(200).json({message: 'sender created added successfully in session',
      senderData: sender
    }
    )
    }catch(error){
      res.status(500).json({error: error.message})
    }

}

const receiverDetails = async (req, res)=> {
  const { name, email, phone_number, county, street_name, building_name, nearest_landmark} = req.body

  const validationErrors = validateSender_ReceiverFields({ name, email, phone_number, county, street_name, building_name, nearest_landmark});
  if(validationErrors.length > 0){
    return res.status(400).json({errors: validationErrors})
  }

  try{
    const receiver = { name, email, phone_number, county, street_name, building_name, nearest_landmark};

    // Store receiver details in session
    //req.session.receiver = receiver;
    
    res.status(200).json({message: "receiver successfully added to session",
      data: receiver
    })


  }catch(error){
    return res.status(500).json({error: error.message})
  }
}

const parcelDetails = async(req, res)=> {

  const shipments = req.body;

  // Validate input
  if (!Array.isArray(shipments) || shipments.length === 0) {
    return res.status(400).json({ error: "Request body must be a non-empty array of shipments" });
  }

  const validationErrors = [];
  const parcels = [];

  // Single loop for validation and processing
  for (const shipment of shipments) {
    const { content, weight, number_of_pieces } = shipment;

    // Validate fields
    if (!content || !weight || !number_of_pieces ) {
      validationErrors.push({
        shipment,
        message: "All fields (content, weight, number_of_pieces, amount) are required",
      });
      continue; // Skip invalid shipments
    }

    // Process valid shipments
    parcels.push({ content, weight, number_of_pieces });
  }

  // Handle validation errors
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed for some shipments",
      errors: validationErrors,
    });
  }

  try{  

    // Update session
    req.session.parcels = parcels;

    // Send response
    res.status(200).json({
      success: true,
      message: "Parcels added successfully in session",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }

}


const orderCreation = async (req, res) => {
  const {sender, receiver, parcels} = req.body
  const senderjson = JSON.parse(sender)
  const receiverjson = JSON.parse(receiver)


  // Validate sender and receiver data
  if (!sender || !receiver) {
    return res.status(400).json({ error: "Sender or receiver details are missing in session" });
  }
  console.log(senderjson.county);

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
      [senderjson.county, receiverjson.county]
     );
      console.log(routes);

      let direction;

      const senderIndex = routes[0].sequence_order.indexOf(senderjson.county);
      const receiverIndex = routes[0].sequence_order.indexOf(receiverjson.county);
      
      if (senderIndex < receiverIndex) {
        direction = 'forward';
      } else if (senderIndex > receiverIndex) {
        direction = 'reverse'
      }

      let validRoute = []; // Store the selected route
      
      validRoute.push(routes[0]);
        
      console.log(validRoute)

   if (validRoute.length === 0) {
      throw new Error('No valid route found for the given counties and direction');
   }

   // Use the first valid route (or let the user choose)
   const selectedRoute = validRoute[0];

    // Assign route_id and direction to the order
    const order = {
      route_id: selectedRoute.route_id,
      direction: direction,
      current_county_office: senderjson.county,
      senderName: senderjson.name,
      senderEmail: senderjson.email,
      senderPhone_number: senderjson.phone_number,
      pickupCounty: senderjson.county,
      pickupbuilding_name: senderjson.building_name,
      pickupnearest_landmark: senderjson.nearest_landmark,
      receiverName: receiverjson.name,
      receiverEmail: receiverjson.email,
      receiverPhone_number: receiverjson.phone_number,
      deliverCounty: receiverjson.county,
      delivery_street_name: receiverjson.street_name,
      delivery_building_name: receiverjson.building_name,
      delivery_nearest_landmark: receiverjson.nearest_landmark,
      estimated_delivery: add48HoursToNow()
    };

    // Insert the order into the database
    const [result] = await db.query("INSERT INTO tempOrders SET ?", [order]);    
    //console.log(result)


    if (parcels.length === 0) {
      throw new Error("No parcels provided for the order");
    }
  
    const parcelData = parcels.map((parcel) => ({
      order_id: result.insertId,
      content: parcel.content,
      weight: parcel.weight,
      number_of_pieces: parcel.number_of_pieces,
    }));
  
    // Use bulk insert for better performance
    await db.query("INSERT INTO parcels (order_id, content, weight, number_of_pieces) VALUES ?", [
    parcelData.map((parcel) => [parcel.order_id, parcel.content, parcel.weight, parcel.number_of_pieces]),
    ]);
    sendEmail('mohaski24@gmail.com', 'Modern Cargo', 'brotherlyreminder@gmail.com');
    res.status(200).json({
      message: 'order and parcel added successfully',
      order_id: result.insertId
    })
  } catch (err) {
    console.error("Error in orderCreation:", err);
    return res.status(500).json({ error: err.message });
  }
};

const getOrderpaymentUpdateStatus = async(req, res) => {
  const {order_id} = req.params;

  if(!order_id){
    res.status(400).json({message: 'order_id must be there'})
  }

  try {
    const order = await db.query('SELECT * FROM temporders WHERE order_id = ?', [order_id])
    res.status(200).json({
      message: 'order data retrieved successfully',
      order: order
    })
  } catch (error) {
    res.status(500).json({error: error.message})
  }

}

const confirmOrder = async (req, res) => {
  const {payment_time, order_id} = req.body;
  console.log(payment_time, order_id)
  if (!order_id) {
    return res.status(400).json({ message: "Order ID is required" });
  }else if (!payment_time ) {
    return res.status(400).json({ message: "payment_time is required" });
  }
  try {
    //const { order_id } = req.params; // Or req.body if it's in the request body

    const trackingNumber = await generateTrackingNumber();

    const query = `UPDATE temporders SET status = ?, tracking_number = ?, payment_time = ? WHERE order_id = ?`;
    const values = ['To be collected', trackingNumber, payment_time, order_id];

    const [result] =  await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ 
      message: "Order confirmed",
      trackingNumber });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


 
module.exports = {
  senderDetails,
  receiverDetails,
  parcelDetails,
  orderCreation,
  confirmOrder,
  getOrderpaymentUpdateStatus
};
