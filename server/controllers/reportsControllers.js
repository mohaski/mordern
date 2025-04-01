const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);

const getOrderManagers = async (req, res) => {
    const {county} = req.params;
    console.log(county)

    if(!county) return res.status(400).json({message: 'user_id or county is missing'});

    try{
        const orderManagers = await db.query(`
           SELECT * FROM users WHERE role = ? AND county = ?`, ['cashier', county]);

        return res.status(200).json({
            message: 'order managers retrieved',
            orderManagers: orderManagers[0]
        })
    }catch(error){
        return res.status(500).json({error: error.message})
    }
}

const getCountyDrivers = async (req, res) => {
    const {county} = req.params;
    console.log(county)

    if(!county) return res.status(400).json({message: 'county is missing'});

    try{
        const countyDrivers = await db.query(`
           SELECT * FROM users WHERE role = ? AND county = ?`, ['driver', county]);

        return res.status(200).json({
            message: 'county drivers retrieved',
            countyDrivers: countyDrivers[0]
        })
    }catch(error){
        return res.status(500).json({error: error.message})
    }
}

// Orders Worked by Order Manager (Update to filter by county)
const getOrdersByOrderManager = async (req, res) => {
    try {
        const { startDate, endDate, user_id } = req.query; 

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        const adjustedStartDate = `${startDate} 00:00:00`;
        const adjustedEndDate = `${endDate} 23:59:59`;

        // Fetch orders
        const [orders] = await db.query(
            `SELECT * FROM temporders WHERE served_by = ? AND created_at BETWEEN ? AND ?`, 
            [user_id, adjustedStartDate, adjustedEndDate]
        );

        // Fetch parcels for each order in parallel
        const reportData = await Promise.all(
            orders.map(async (row) => {
                const [parcels] = await db.query(
                    `SELECT content, weight, number_of_pieces FROM parcels WHERE order_id = ?`, 
                    [row.order_id]
                );

                return {
                    orderId: row.order_id,
                    createdAt: row.created_at.toISOString(),
                    totalCost: row.total_cost,
                    pickupLocation: `${row.pickupstreet_name}, ${row.pickupcounty}`, // Added row.county
                    deliveryLocation: `${row.delivery_street_name}, ${row.deliverCounty}`,
                    parcelDetails: parcels,
                };
            })
        );


        return res.status(200).json({ success: true, data: reportData });

    } catch (error) {
        console.error('Error in getOrdersByOrderManager:', error);
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};


  
  // Orders Delivered by Driver (Update to filter by county)
  const getOrdersDeliveredByDriver = async (req, res) => {
    try {
      const { startDate, endDate, user_id } = req.query;
      console.log(startDate, endDate, user_id);

  
      // Validate date parameters
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Missing required date parameters' });
      }

      const adjustedStartDate = `${startDate} 00:00:00`;
      const adjustedEndDate = `${endDate} 23:59:59`;

        // Fetch orders
        const [orders] = await db.query(
            `SELECT * FROM temporders WHERE assignedDelivery_countyDriver = ? AND delivery_time BETWEEN ? AND ?`, 
            [user_id, adjustedStartDate, adjustedEndDate]
        );
  
      // Format the response data
      const reportData = orders.map(row => ({
        orderId: row.order_id,
        droppedAt: row.transitDroppingTime ? row.transitDroppingTime: 'N/A',
        estimated_delivery: row.estimated_delivery ? row.estimated_delivery.toISOString() : 'N/A',
        deliveredAt: row.delivery_time.toISOString(), // delivered_at is guaranteed to be non-null due to WHERE clause
      }));
  
      console.log("Orders fetched:", orders);
      console.log("Report data:", reportData);
  
      return res.status(200).json({ success: true, data: reportData });
    } catch (error) {
      console.error('Error in getOrdersDeliveredByDriver:', error);
      return res.status(500).json({ message: error.message || 'Server error' });
    }
  };
  

const getPendingOrders = async (req, res) => {
    try {

        const { county } = req.user;
    
        const [orders] = await db.query(
          `SELECT * FROM temporders WHERE status = "Pending Cost Calculation" AND pickupcounty = ?`,
          [county]
        );
    
        res.status(200).json({ orders });
      } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getOrderManagers,
    getCountyDrivers,
    getOrdersByOrderManager,
    getOrdersDeliveredByDriver,
    getPendingOrders
}