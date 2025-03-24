const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);

const getParcelDetails = async (req, res) => {
  const order_id = req.params;

  if(!order_id)  return res.status(400).json({message: 'order_id must be provided from req.body'});

  try {
    const [parcels] = await db.query(`SELECT * FROM parcels WHERE order_id = ?`, [order_id.order_id]);
    console.log(order_id)
    console.log(parcels);
    return res.status(200).json({
      message: 'Parcel details retrieved successfully',
      parcels
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

////  COUNTY DRIVERS   /////
const getPickupTasks = async (req, res) => {
  const { county } = req.params;
  console.log(county);

  if(!county){
    return res.status(400).json({message: 'county must be provided from req.user'});
  }

  try {
    const [orders] = await db.query(
      'SELECT * FROM temporders WHERE status = "To Be Collected" AND current_county_office = ?',
      [county]
    );

    if(orders.length < 1){
      return res.status(200).json({
        message: 'no orders for collection at the moment',
        orders
      })
    }

    return res.status(200).json({
      message: 'orders list to be picked up presented',
      orders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getOrderParcelDetails = async (req, res) => {
  const {order_id} = req.params;

  try{
    const [details] = await db.query(
      ` SELECT temporders.*, parcels.* 
       FROM temporders LEFT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id} 
      
       UNION  
   
       SELECT temporders.*, parcels.*  
       FROM temporders RIGHT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id}`,
   
       [order_id]
     );
   
     console.log(details);
   
     res.status(200).json({message: 'order and parcel details successfully retreaved .',
       details
     })
  }catch(error){
    res.status(500).json({error: error.message})
  }

};
      

const confirmPickup = async (req, res) => {
  const { order_id } = req.body;
  const { user_id } = req.user; 

  if(!order_id || !user_id){
    return res.status(400).json({message: 'order_id and user_id are required'});
  }

  try {
    await db.query(
      'UPDATE temporders SET status = ?, assigned_county_driver_id = ?, pickup_time = ? WHERE order_id = ?',
      ["Collected", user_id, new Date(), order_id]
    );

    return res.status(200).json({
      message: 'Parcel collected successfully',
      order_id: order_id,
      status: 'Collected',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getPickedOrders = async (req, res) => {
  const { user_id } = req.user;

  if(!user_id){
    return res.status(400).json({mesaage: 'county must be provided from req.user'});
  }

  try {
    const [orders] = await db.query(
      'SELECT * FROM temporders WHERE status = ? AND assigned_county_driver_id = ?',
      ["Collected", user_id]
    );

    if(orders.length === 0){
      return res.status(200).json({message: 'currently you havent picked any order  '})
    }

    res.status(200).json({
      message: 'orders list of pickedup presented',
      orders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const confirmPickupDropoff = async (req, res) =>{
  const [orders] = req.body;
  const status = 'Waiting transit'

  try{
    const [result] = await db.query(`
      UPDATE temporders 
      SET status = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${status}'`)
            .join(" ")} 
        END
      WHERE order_id IN (${orders.map((o) => o.order_id).join(",")}) 
      AND status = 'Collected';
    `)

    if(result.affectedRows < 1){
      return res.status(400).json({message: 'no orders yet to pickedup'})
    }

    res.status(200).json({message: 'status updated to Waiting transit for all pickedup orders'})
  }catch(error){
    res.status(500).json({error: error.message})

  }
}


////delivery processes////
const getDeliveryTasks = async (req, res) => {
  const { county } = req.params;

  try {
    const [orders] = await db.query(
      'SELECT * FROM temporders WHERE status = ? AND current_county_office = ?',
      ["To Be Delivered",county]
    );

    return res.status(200).json({ 
      message: 'orders to be delivered list presented',
      orders
    });
  } catch (error) {
    return res.status(500).json({ error: error.message});
  }
};

const confirmDropoffPickup = async (req, res) => {
  const {orders} = req.body;
  const {user_id} = req.user;
  const status = 'in delivery'

  try{
    const [result] = await db.query(`
      UPDATE temporders 
      SET status = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${status}'`)
            .join(" ")} 
        END
        assigned_county_driver_id = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${user_id}'`)
            .join(" ")} 
        END
      WHERE order_id IN (${orders.map((o) => o.order_id).join(",")}) 
      AND status = 'To be delivered';
    `)

    if(result.affectedRows < 1){
      return res.status(400).json({message: 'no orders yet to update pickup '})
    }

    return res.status(200).json({message: 'status updated to Waiting transit for all pickedup orders'})
  }catch(error){
    return res.status(500).json({error: error.message})

  }
}

const confirmDelivery = async (req, res) => {
  const { order_id, payment_mode } = req.body;
  const { user_id } = req.user;

  console.log(payment_mode);

  if(!order_id || !user_id) return res.status(400).json({message: 'order_id and user_id cannot be null'});

  try {
    await db.query(
      'UPDATE temporders SET status = ?, assigned_county_driver_id = ?, payment_mode = ?, delivery_time = ? WHERE order_id = ?',
      [ "Delivered", user_id, payment_mode, new Date(), order_id ]
    );

    return res.json({
      message: 'Parcel delivered successfully',
      order_id: order_id,
      status: 'Delivered',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

//////////////////////////////////////////////////////////////////////////

///// TRANSIT DRIVERS  ///////

const checkIn = async (req, res) => {
  const { currentLocation } = req.body;
  const { user_id } = req.user;


  if(!currentLocation || !user_id) return res.status(400).json({message: 'county and user_id must be provided'});

  try {
   const [result] = await db.query('INSERT INTO checkins (driver_id, county) VALUES (?, ?)', [
      user_id,
      currentLocation,
    ]);
    

    if(result.affectedRows === 0 ) return res.status(400).json({message: 'checkin was not added in database'});

    //req.session.checkin = result

    return res.status(200).json({ message: `Checked into ${currentLocation} successfully` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAvailableTransfers = async (req, res) => {
  const { user_id, route_id, current_direction } = req.user;

  try {
    // Get latest check-in
    const [checkins] = await db.query(
      'SELECT county FROM checkins WHERE driver_id = ? ORDER BY checkin_time DESC LIMIT 1',
      [user_id]
    );

    if (!checkins.length) return res.json([]);


    const currentCounty = checkins[0].county;
    console.log(currentCounty)

    // Get transfers in current county
    const [transfers] = await db.query(
      'SELECT * FROM temporders WHERE status = "Waiting Transit" AND current_county_office = ? AND route_id = ? AND direction = ?',
      [currentCounty, route_id, current_direction]
    );

    return res.status(200).json({
      message: `fetching available transfers in ${currentCounty} office successful `,
      transfers
    });
  } catch (error) {
    return res.status(500).json({ error: error.message});
  }
};

const getOrderParcelDetailsofTransfers = async(req, res) => {
  const {order_id} = req.params;

  try{
    const [details] = await db.query(
      ` SELECT temporders.*, parcels.* 
       FROM temporders LEFT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id} 
      
       UNION  
   
       SELECT temporders.*, parcels.*  
       FROM temporders RIGHT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id}`,
   
       [order_id]
     );
   
     console.log(details);
   
     res.status(200).json({message: 'order and parcel details successfully retreaved.',
       details
     })
  }catch(error){
    res.status(500).json({error: error.message})
  }

}

const confirmPickupforTransfer = async (req, res) => {
  const [orders] = req.body;
  console.log(orders)
  const { user_id } = req.user;
  const status = 'In Transit';

  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'No orders provided for pickup.' });
    }

    // Validate that all orders have valid order_id
    const validOrders = orders.filter(order => order && typeof order.order_id === 'number');
    if (validOrders.length === 0) {
      return res.status(400).json({ message: 'No valid order IDs provided.' });
    }

    const query = `
  UPDATE temporders 
  SET 
    status = CASE 
      ${validOrders
        .map((order) => `WHEN order_id = ${order.order_id} THEN '${status}'`)
        .join(" ")}
    END,
    assigned_transit_driver_id = CASE 
      ${validOrders
        .map((order) => `WHEN order_id = ${order.order_id} THEN '${user_id}'`)
        .join(" ")}
    END,
    transit_start_time = CASE 
      ${validOrders
        .map((order) => `WHEN order_id = ${order.order_id} THEN '${new Date().toISOString().slice(0, 19).replace('T', ' ')}'`)
        .join(" ")}
    END
  WHERE order_id IN (${validOrders.map((o) => o.order_id).join(",")}) 
  AND status = 'Waiting Transit';
`;


    console.log('Generated SQL:', query); // Debug log
    const [result] = await db.query(query);

    if (result.affectedRows < 1) {
      return res.status(400).json({ message: 'No orders were updated. They may already be picked or delivered.' });
    }

    return res.status(200).json({ message: 'Status updated to "in transit" for all picked-up orders.' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


const getOrdersToBedroppedOff = async (req, res) => {
const {user_id} = req.user;
console.log(user_id)

  const [checkedCounty] = await db.query(
    'SELECT county FROM checkins WHERE driver_id = ? ORDER BY checkin_time DESC LIMIT 1',
    [user_id]
  );

  //console.log(checkedCounty);

  if(!checkedCounty || checkedCounty.length === 0) return res.status(400).json({message: 'checkedCounty is empty'})
  const current_county_office = checkedCounty[0].county;
  console.log(current_county_office);

  try {

    // Get transfers in current county
    const [dropOffs] = await db.query(
      'SELECT * FROM temporders WHERE status = ? AND deliverCounty = ? AND assigned_transit_driver_id = ? ',
      [ "In Transit", current_county_office, user_id ]
    );

    return res.status(200).json({
      message: `fetching to be droppedoff order in ${current_county_office} office successful `,
      dropOffs
    });
  } catch (error) {
    return res.status(500).json({ error: error.message});
  }
}


const getOrderParcelDetailsofDropoff = async (req, res) => {
  const {order_id} = req.params;

  try{
    const [details] = await db.query(
      ` SELECT temporders.*, parcels.* 
       FROM temporders LEFT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id} 
      
       UNION  
   
       SELECT temporders.*, parcels.*  
       FROM temporders RIGHT JOIN parcels 
       ON temporders.order_id = parcels.order_id 
       WHERE parcels.order_id = ${order_id}`,
   
       [order_id]
     );
   
     console.log(details);
   
     return res.status(200).json({
      message: 'order and parcel details successfully retreaved.',
      details
     })
  }catch(error){
    return res.status(500).json({error: error.message})
  }
}

const confirmDropoff = async (req, res) => {
  const [orderIds] = req.body;
  const {user_id} = req.user;


  const [checkins] = await db.query(
    'SELECT county FROM checkins WHERE driver_id = ? ORDER BY checkin_time DESC LIMIT 1',
    [user_id]
  );

    const status = 'to be delivered';

  try{
    const [result] = await db.query(`
      UPDATE temporders 
      SET status = CASE 
          ${orderIds
            .map((id) => `WHEN ${id} THEN '${status}'`)
            .join(" ")} 
        END,
        current_county_office = CASE 
          ${orderIds
            .map((id) => `WHEN ${id} THEN '${checkins[0].county}'`)
            .join(" ")} 
        END
      WHERE order_id IN (${orderIds.map((id) => id).join(",")}) 
      AND status = 'In Transit';
    `)

    if(result.affectedRows < 1){
      return res.status(400).json({message: 'no orders yet to update dropoff '})
    }

    return res.status(200).json({message: 'status updated to Waiting transit for all pickedup orders'})
  }catch(error){
    return res.status(500).json({error: error.message})
  }
};

const getDriverRoute = async (req, res) => {
  const { route_id } = req.user;
  console.log(req.user);

  if (!route_id) {
    return res.status(400).json({ message: 'route id is null' }); // Add return
  }
  console.log(route_id);

  try {
    const [routes] = await db.query('SELECT * FROM routes WHERE route_id = ?', [route_id]);
    console.log('Route:', routes);

    if (routes.length === 0) {
      return res.status(404).json({
        message: 'Route not found'
      });
    }

    const route = routes[0]; // Get the first row

    return res.status(200).json({
      message: 'Route details retrieved',
      route: {
        route_id: route.route_id,
        sequence_order: route.sequence_order || [] // Ensure sequence_order is an array
      }
    });
  } catch (err) {
    console.error('Error fetching route:', err);
    return res.status(500).json({
      message: 'Error fetching route',
      error: err.message
    });
  }
};

const directionChange = async (req, res) => {
  const { user_id } = req.user;

  try {
    // Fetch current direction and route_id
    const [rows] = await db.query(
      `SELECT current_direction, route_id FROM users WHERE user_id = ?`,
      [user_id]
    );

    const userData = rows[0];

    if (!userData) {
      return res.status(400).json({ message: 'User data not found!' });
    }

    let newDirection;
    let newRouteId;

    if (userData.current_direction === 'forward') {
      newDirection = 'reverse';
      newRouteId = userData.route_id + 1;
    } else if (userData.current_direction === 'reverse') {
      newDirection = 'forward';
      newRouteId = userData.route_id - 1;
    } else {
      return res.status(400).json({ message: 'Invalid current_direction value!' });
    }

    // Update new direction and new route_id
    const [result] = await db.query(
      `UPDATE users SET current_direction = ?, route_id = ? WHERE user_id = ?`,
      [newDirection, newRouteId, user_id]
    );

    return res.status(200).json({
      message: `Direction updated to ${newDirection}, route_id is now ${newRouteId}`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};




/////////////////////////////////////////////////////////////////

module.exports = { 
  checkIn, 
  getDriverRoute,
  directionChange,
  getAvailableTransfers, 
  getPickupTasks, 
  confirmPickup, 
  getDeliveryTasks, 
  confirmDelivery, 
  getOrderParcelDetails, 
  confirmPickupDropoff, 
  getPickedOrders,
  getParcelDetails,
  getAvailableTransfers,
  getOrdersToBedroppedOff,
  confirmDropoff,
  confirmPickupforTransfer
};
