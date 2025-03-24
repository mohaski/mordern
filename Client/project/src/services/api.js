import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000', // Update with your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Required for session cookies
});

// Automatically add Authorization header if token exists
// Only attach token if running in a browser
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      throw new Error('Network error - please check your connection and try again');
    }
    
    if (error.response?.status === 401) {
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);



// login
export const loginApi = (loginData) => API.post('/login', loginData);

// Sender Details
export const saveSender = (senderData) => API.post('/online/senderDetails', senderData);

// Receiver Details
export const saveReceiver = (receiverData) => API.post('/online/sendersDetails/receiverDetails', receiverData);

// Parcel Details
export const saveParcels = (parcelsData) => API.post('/online/sendersDetails/receiverDetails/parcelDetails', parcelsData);

// Create Order
export const createOrder = (sender, receiver, parcels ) => API.post('/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation', {sender, receiver, parcels});

// Confirm Order
export const confirmOrder = (order_id, payment_time) => API.post(`/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/waitingPaymentUpdate/${order_id}/confirmOrder`, {order_id, payment_time});

// Get Session Data
export const getSession = () => API.get('/get-session');

// get payment status
export const paymentStatus = (order_id) => API.get(`/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/waitingPaymentUpdate/${order_id}`);

export const trackOrder = (tracking_number) => API.get(`/customer/order/track/${tracking_number}`);

//////////// order manager ////////////////////

export const walk_inSaveSender = (senderData) => API.post('/walk-in/senderDetails', senderData);

export const getPendingPayments = (county) => API.get(`/cashier/pendingPayments/${county}`);

export const getPayment = (order_id) => API.get(`/cashier/pendingPayments/payment/${order_id}`);

export const processPayment = (order_id, amounts, total_cost) => API.post('/cashier/updatepayment/:order_id/updateOrderCost', {order_id, amounts, total_cost});

export const createOrderManager = (county, sender, receiver, parcels, total_cost ) => API.post('/walk-in/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation', {county, sender, receiver, parcels, total_cost});

export const orderManagerConfirmOrder = (order_id, payment_mode ) => API.post('/walk-in/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/orderManagerconfirmOrder', {order_id, payment_mode});



/////// county driver ////////////////////////////

export const getPickupTasks = (county) => API.get(`/county_Driver/pickupTasks/${county}`)

export const getDeliveryTasks = (county) => API.get(`/county_Driver/DeliveryTasks/${county}`)

export const getParcelDetails = (order_id) => API.get(`/parcels/${order_id}`)

export const confirmPickup = (order_id, user_id) => API.post(`/county_Driver//getOrderParcelDetails/:order_id/confirmPickup`, {order_id, user_id});

export const confirmPickupDropoff = (orders) => API.post(`/county_Driver//getOrderParcelDetails/:order_id/confirmPickup/getPickedOrders/confirmPickupDropoff`, [orders]);

export const confirmDelivery = (order_id, user_id, payment_mode) => API.post(`/county_Driver/DeliveryTasks/confirmDelivery`, {order_id, user_id, payment_mode});

export const directionChange = () => API.put(`/transit_Driver/changeCurrentDirection`);


////////////////  transit Driver ///////////////////////////

export const getDriverRoute = () => API.get('/transit_Driver/routeSequence');

export const getAvailableTransfers = () => API.get('/transit_Driver/pickupTasks');

export const getOrdersToBedroppedOff = () => API.get('/transit_Driver/dropoffs');

export const checkIn = (currentLocation) => API.post('/transit_Driver/checkIn', {currentLocation});

export const confirmDropoff = (orders) => API.post('/transit_Driver/dropoffs/confirmDropoffs', [orders]);

export const confirmPickupforTransfer = (orders) => API.post('/transit_Driver/pickups/confirmPickups', [orders]);












export const changePassword = (order_id, user_id) => API.post(`/county_Driver//getOrderParcelDetails/:order_id/confirmPickup`, {order_id, user_id});




