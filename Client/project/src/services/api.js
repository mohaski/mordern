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
export const confirmOrder = (orderId, paymentTime) => API.post('/confirmOrder', { order_id: orderId, payment_time: paymentTime });

// Get Session Data
export const getSession = () => API.get('/get-session');

// get payment status
export const paymentStatus = (order_id) => API.get(`/online/sendersDetails/receiverDetails/parcelDetails/orderCreation&parcleCreation/waitingPaymentUpdate/${order_id}`);


//////////// order manager ////////////////////

export const walk_inSaveSender = (senderData) => API.post('/walk-in/senderDetails', senderData);

export const getPendingPayments = (county) => API.get('/cashier/pendingPayments', county);

export const getPayment = (order_id) => API.get(`/cashier/pendingPayments/payment/${order_id}`);

export const processPayment = (order_id, amounts, total_cost) => API.post('/cashier/updatepayment/:order_id/updateOrderCost', {order_id, amounts, total_cost})


/////// county driver ////////////////////////////

export const getPickupTasks = (county) => API.get('/county_Driver/pickupTasks', county)

export const getDeliveryTasks = (county) => API.get('/county_Driver/DeliveryTasks', county)
