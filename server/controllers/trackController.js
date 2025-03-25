const { checkRecordExists } = require("../utils/sqlFunctions");
const { generateEmailBody, openGmail } = require('../utils/emailBodyGenerator');
const trackorderStatus = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber || typeof trackingNumber !== "string" || trackingNumber.trim() === "") {
      return res.status(400).json({ error: "Valid tracking number is required!" });
    }

    // Assuming checkRecordExists returns the full record or null
    const order = await checkRecordExists("temporders", "tracking_number", trackingNumber);

    if (!order) {
      return res.status(404).json({
        error: "No order found. Please check if the tracking number is correct!",
      });
    }

    // Return more detailed response
    res.status(200).json({
      message: 'order details being tracked',
      trackedOrder: order
    });
  } catch (err) {
    console.error("Error tracking order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const emailGenerator = async (req, res) => {
  const { orderId } = req.params;

  try {
    // Fetch order details
    const [order] = await db.query(
      'SELECT * FROM temporders WHERE order_id = ? AND status = "Pending Cost Calculation"',
      [orderId]
    );
    if (!order.length) {
      return res.status(404).json({ message: 'Order not found or already confirmed' });
    }

    const orderDetails = order[0];

    // Update status to confirmed (e.g., 'processing')
    await db.query(
      'UPDATE temporders SET status = "processing" WHERE order_id = ?',
      [orderId]
    );

    // Generate email content
    const subject = `Order Confirmation - Tracking #${orderDetails.tracking_number}`;
    const body = generateEmailBody(orderDetails.SenderName, orderDetails);
    const gmailUrl = openGmail(orderDetails.SenderEmail, subject, body);

    res.status(200).json({
      message: 'Order confirmed',
      gmailUrl,
    });
  } catch (err) {
    console.error('Error confirming order:', err);
    res.status(500).json({ message: 'Failed to confirm order', error: err.message });
  }
}

module.exports = {trackorderStatus, emailGenerator};