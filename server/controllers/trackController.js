const { checkRecordExists } = require("../utils/sqlFunctions");
//const ordersSchema = require("../models/ordersModel");

const trackorderStatus = async (req, res) => {
  try {
    const trackingNumber = req.params.trackingNumber;
    if (!trackingNumber) {
      return res.status(400).json({ error: "Tracking number is required!" });
    }

    const existingRecord = await checkRecordExists(
      "orders",
      "trackingNumber",
      trackingNumber
    );

    if (!existingRecord) {
      return res.status(400).json({
        error:
          "There is no order like this please check tracking number if it is correct!!!",
      });
    }

    /* const orderRecord = await returnRecord(
      "orders",
      "trackingNumber",
      trackingNumber
    );*/
    res.status(200).json({ status: existingRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = trackorderStatus;
