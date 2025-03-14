const express = require("express");
const authenticate = require("../middleware/authenticate");

const {
    checkIn, getAvailableTransfers, startTransfer, completeTransfer, getPickupTasks, confirmPickup, getDeliveryTasks, confirmDelivery, getOrderParcelDetails, confirmPickupDropoff,getPickedOrders
} = require('../controllers/driversControllers');
//const authorizeRole = require("../middleware/authorizeRole");
const router = express.Router();

router.use(authenticate);

router.get('/county_Driver/pickupTasks', getPickupTasks);
router.get('/county_Driver//getOrderParcelDetails/:order_id', getOrderParcelDetails);
router.post('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup', confirmPickup);
router.get('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup/getPickedOrders', getPickedOrders);
router.post('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup/getPickedOrders/confirmPickupDropoff', confirmPickupDropoff);

router.get('/county_Driver/DeliveryTasks', getDeliveryTasks)

module.exports = router