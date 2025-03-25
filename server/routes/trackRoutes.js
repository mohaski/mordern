const {trackorderStatus, emailGenerator} = require("../controllers/trackController");
const express = require("express");
const router = express.Router();

router.get("/customer/order/track/:trackingNumber", trackorderStatus);
router.post('/customer/sendEmail', emailGenerator)

module.exports = router;
