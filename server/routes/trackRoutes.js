const trackorderStatus = require("../controllers/trackController");
const express = require("express");
const router = express.Router();

router.get("/customer/order/track/:trackingNumber", trackorderStatus);

module.exports = router;
