const mysql = require("mysql2/promise");
const config = require("../config/config");
const db = mysql.createPool(config);

const getPayment = async (req, res) => {
  
  const { order_id } = req.params;

  try {
    // Update order status and payment amount
    const [order_parcels] = await db.query(
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

      console.log(order_parcels)

    res.status(200).json({
      message: 'order details displayed successfully',
      order: order_parcels,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPendingPayments = async (req, res) => {
  try {
    const { county } = req.params;
    console.log(`${county}001`);

    const [orders] = await db.query(
      `SELECT * FROM temporders WHERE status = "Pending Cost Calculation" AND pickupcounty = ?`,
      [county]
    );

    res.status(200).json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const processPayment = async (req, res) => {
  const { order_id, amounts, total_cost} = req.body;
  console.log(amounts)


  if(!Array.isArray(amounts) || amounts.length === 0){
    return res.status(400).json({message: 'amounts must be a non-empty array'})
  }


  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Fetch parcel IDs and validate data
    const [parcels] = await conn.query(
      "SELECT parcel_id FROM parcels WHERE order_id = ?",
      [order_id]
    );

    if (parcels.length !== amounts.length) {
      await conn.rollback();
      return res.status(400).json({ message: "Mismatched number of parcels and amounts" });
    }

    // Construct bulk update query
    const updateQuery = `
      UPDATE parcels 
      SET payment_amount = CASE parcel_id 
      ${parcels
        .map((parcel, index) => `WHEN ${parcel.parcel_id} THEN ${amounts[index]}`)
        .join(" ")} 
      END
      WHERE parcel_id IN (${parcels.map((p) => p.parcel_id).join(",")});
    `;

    await conn.query(updateQuery);

    // Calculate total cost and update the temporders table
    //const total_cost = amounts.reduce((acc, curr) => acc + curr, 0);
    await conn.query("UPDATE temporders SET total_cost = ?, status = ? WHERE order_id = ?", [total_cost, 'Awaiting Confirmation', order_id]);

    await conn.commit();

    res.status(200).json({
      message: "Payment amounts for the parcels and order updated successfully",
    });

  } catch (error) {
    await conn.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
  
}





module.exports = { processPayment, getPendingPayments, getPayment };