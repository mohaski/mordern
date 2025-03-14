const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);

////  COUNTY DRIVERS   /////
const getPickupTasks = async (req, res) => {
  const { county  } = req.user;

  if(!county){
    return res.status(400).json({mesaage: 'county must be provided from req.user'});
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
   
     res.status(200).json({message: 'order and parcel details successfully retreaved.',
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
      'UPDATE temporders SET status = ?, assigned_county_driver_id = ? WHERE order_id = ?',
      ["Collected", user_id, order_id]
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
  const {orders} = req.body;
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
  const { county } = req.user;

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
  const { orderId } = req.params;
  const { user_id } = req.user;

  try {
    await db.query(
      'UPDATE orders SET status = "Delivered", assigned_county_driver_id = ? WHERE order_id = ?',
      [user_id, orderId]
    );

    return res.json({
      message: 'Parcel delivered successfully',
      order_id: orderId,
      status: 'Delivered',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

//////////////////////////////////////////////////////////////////////////

///// TRANSIT DRIVERS  ///////

const checkIn = async (req, res) => {
  const { county } = req.body;
  const { user_id } = req.user;

  try {
   const [result] = await db.query('INSERT INTO checkins (driver_id, county) VALUES (?, ?)', [
      user_id,
      county,
    ]);

    req.session.checkin = result

    res.json({ message: `Checked into ${county} successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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

    // Get transfers in current county
    const [transfers] = await db.query(
      'SELECT * FROM orders WHERE status = "Waiting Transit" AND current_county_office = ? AND route_id = ? AND direction = ?',
      [currentCounty, route_id, current_direction]
    );

    return res.status(200).json({
      message: `fetching available transfers in ${currentCounty} office successful `,
      transfers});
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
  const {orders} = req.body;
  const {user_id} = req.user;
  const status = 'in transit';

  try{
    const [result] = await db.query(`
      UPDATE temporders 
      SET status = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${status}'`)
            .join(" ")} 
        END
        assigned_transit_driver_id = CASE 
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


const getOrdersToBedroppedOff = async (req, res) => {
  const checkin = req.session.checkin
  const current_county_office = checkin.current_county_office

  try {

    // Get transfers in current county
    const [dropOffs] = await db.query(
      'SELECT * FROM temporders WHERE status = ? AND deliverCounty = ? ',
      [ "in Transit", current_county_office ]
    );

    return res.status(200).json({
      message: `fetching to be droppedoff order in ${currentCounty} office successful `,
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
  const {orders} = req.body;
  const {user_id} = req.user;
  const status = 'to be delivered';

  try{
    const [result] = await db.query(`
      UPDATE temporders 
      SET status = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${status}'`)
            .join(" ")} 
        END
        assigned_transit_driver_id = CASE 
          ${orders
            .map((order) => `WHEN ${order.order_id} THEN '${user_id}'`)
            .join(" ")} 
        END
      WHERE order_id IN (${orders.map((o) => o.order_id).join(",")}) 
      AND status = 'To be delivered';
    `)

    if(result.affectedRows < 1){
      return res.status(400).json({message: 'no orders yet to update dropoff '})
    }

    return res.status(200).json({message: 'status updated to Waiting transit for all pickedup orders'})
  }catch(error){
    return res.status(500).json({error: error.message})
  }
}


/////////////////////////////////////////////////////////////////

module.exports = { 
  checkIn, 
  getAvailableTransfers, 
  getPickupTasks, 
  confirmPickup, 
  getDeliveryTasks, 
  confirmDelivery, 
  getOrderParcelDetails, 
  confirmPickupDropoff, 
  getPickedOrders
};
