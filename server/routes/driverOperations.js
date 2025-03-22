const express = require("express");
const authenticate = require("../middleware/authenticate");

const {
    checkIn, 
    getAvailableTransfers, 
    startTransfer, 
    completeTransfer, 
    getPickupTasks, 
    confirmPickup, 
    getDeliveryTasks, 
    confirmDelivery, 
    getOrderParcelDetails, 
    confirmPickupDropoff,
    getPickedOrders, 
    getParcelDetails, 
    confirmDropoff, 
    getOrdersToBedroppedOff,
    getDriverRoute,
    directionChange, 
    confirmPickupforTransfer
} = require('../controllers/driversControllers');
//const authorizeRole = require("../middleware/authorizeRole");
const router = express.Router();

router.use(authenticate);

router.get('/parcels/:order_id', getParcelDetails);
router.get('/county_Driver/pickupTasks', getPickupTasks);
router.get('/county_Driver//getOrderParcelDetails/:order_id', getOrderParcelDetails);
router.post('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup', confirmPickup);
router.get('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup/getPickedOrders', getPickedOrders);
router.post('/county_Driver//getOrderParcelDetails/:order_id/confirmPickup/getPickedOrders/confirmPickupDropoff', confirmPickupDropoff);

router.get('/county_Driver/DeliveryTasks', getDeliveryTasks)
router.post('/county_Driver/DeliveryTasks/confirmDelivery', confirmDelivery);



router.post('/transit_Driver/checkIn', checkIn);
router.get('/transit_Driver/routeSequence', getDriverRoute);
router.put('/transit_Driver/changeCurrentDirection', directionChange);
router.get('/transit_Driver/pickupTasks', getAvailableTransfers);
router.post('/transit_Driver/dropoffs/confirmDropoffs', confirmDropoff);
router.post('/transit_Driver/pickups/confirmPickups', confirmPickupforTransfer);

router.get('/transit_Driver/dropoffs', getOrdersToBedroppedOff);



module.exports = router