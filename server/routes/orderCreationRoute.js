const express = require("express");
const authenticate = require("../middleware/authenticate");
const authorizeRole = require('../middleware/authorizeRole')
const {
  receiverDetails,
  senderDetails,
  parcelDetails,
  orderCreation,
  getOrderpaymentUpdateStatus,
  confirmOrder,
} = require("../controllers/onlineOrderscontroller");
const {
  walk_inSenderDetails,
  walk_inReceiverDetails,
  walk_inparcelDetails,
  walk_inOrderCreation,
  orderManagerConfirmOrder,
  getorderManagerOrders
} = require('../controllers/walk-inOrdersController');

const {
  getPayment,
  processPayment, 
  getPendingPayments, 
  //getPendingPayment
} = require('../controllers/paymentProcessController');
const router = express.Router();

router.post("/online/senderDetails", senderDetails);
router.post("/online/sendersDetails/receiverDetails", receiverDetails);
router.post("/online/sendersDetails/receiverDetails/parcelDetails", parcelDetails)
router.post("/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation", orderCreation);
router.get("/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/waitingPaymentUpdate/:order_id", getOrderpaymentUpdateStatus);
router.post("/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/waitingPaymentUpdate/:order_id/confirmOrder", confirmOrder);


/*
router.get("/get-session", (req, res) => {
  res.json({
    sender: req.session.sender || "No sender data",
    receiver: req.session.receiver || "No receiver data",
    parcels: req.session.parcels || "No parcels data"
  });
});
*/
router.post('/walk-in/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/confirmOrder', confirmOrder);


router.post("/walk-in/senderDetails", walk_inSenderDetails);
router.post("/walk-in/sendersDetails/receiverDetails", walk_inReceiverDetails);
router.post("/walk-in/sendersDetails/receiverDetails/parcelDetails", walk_inparcelDetails)
router.post("/walk-in/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation", authenticate, walk_inOrderCreation);
router.post("/walk-in/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/orderManagerconfirmOrder", orderManagerConfirmOrder);

router.get("/cashier/orders/:county", getorderManagerOrders);
router.get("/cashier/pendingPayments/:county", getPendingPayments);
router.get("/cashier/pendingPayments/payment/:order_id", getPayment);

//router.post("/cashier/pendingPayments/:pendingPayment", getPendingPayment);
router.post("/cashier/updatepayment/:order_id/updateOrderCost", authenticate, processPayment);

module.exports = router;
