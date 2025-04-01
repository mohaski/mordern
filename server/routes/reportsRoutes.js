const express = require('express');
const router = express.Router();
const {
    getOrderManagers,
    getCountyDrivers,
    getOrdersByOrderManager,
    getOrdersDeliveredByDriver,
    getPendingOrders,
} = require('../controllers/reportsControllers');
const authenticate = require('../middleware/authenticate');

// Restrict all report endpoints to office_manager role
router.get('/officeManager/orderManagers/:county', getOrderManagers);
router.get('/officeManager/countyDrivers/:county', getCountyDrivers);
router.get('/officeManager/ordersByOrderManager', getOrdersByOrderManager);
router.get('/officeManager/orders-delivered-by-driver', getOrdersDeliveredByDriver);



router.get('/officeManager/pendingOrders', authenticate, getPendingOrders);



module.exports = router;