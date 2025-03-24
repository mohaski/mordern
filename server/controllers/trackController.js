const { checkRecordExists } = require("../utils/sqlFunctions");
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

module.exports = trackorderStatus;