import React, { useState, useEffect } from 'react';
import { Package, AlertCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getPendingPayments } from '../../services/api';

const OrderCostUpdate = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [costs, setCosts] = useState({});
  const navigate = useNavigate();


  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      const county = JSON.parse(sessionStorage.getItem('user')).county
      console.log(county);
      const response = await getPendingPayments(county);
      console.log(response)
      console.log(response.data.orders)
      setOrders(response.data.orders);
      
      // Initialize costs state with empty values
      const initialCosts = response.data.orders.reduce((acc, order) => ({
        ...acc,
        [order.id]: ''
      }), {});
      setCosts(initialCosts);
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCostChange = (orderId, value) => {
    setCosts(prev => ({
      ...prev,
      [orderId]: value
    }));
  };

  const handleUpdateCost = async (orderId) => {
    try {
      const cost = parseFloat(costs[orderId]);
      if (isNaN(cost) || cost <= 0) {
        throw new Error('Please enter a valid cost');
      }
      
      // Remove the updated order from the list
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Clear the cost input
      setCosts(prev => {
        const newCosts = { ...prev };
        delete newCosts[orderId];
        return newCosts;
      });
    } catch (err) {
      alert(err.message || 'Failed to update cost');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Order Cost Updates</h1>
        <p className="text-gray-600">Update costs for pending orders</p>
      </div>
      
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading orders...</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {!loading && orders.length > 0 && (
           <ul role="list" className="divide-y divide-gray-200">
           {orders.map(order => (
             <li 
               key={order.id} 
               onClick={() => handleOrderClick(order.id)}
               className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
             >
               <div className="px-4 py-4 sm:px-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center">
                     <Package className="h-5 w-5 text-gray-400" />
                     <p className="ml-2 text-sm font-medium text-red-600">#{order.order_id}</p>
                   </div>
                   <div className="ml-2 flex-shrink-0 flex">
                     <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                       Pending Cost
                     </p>
                   </div>
                 </div>
                 <div className="mt-2 sm:flex sm:justify-between">
                   <div className="space-y-3">
                     <div>
                       <h4 className="text-sm font-medium text-gray-900">Sender Details</h4>
                       <div className="mt-1 flex items-center text-sm text-gray-500">
                         <MapPin className="h-4 w-4 mr-1" />
                         <span>{order.senderName}</span>
                       </div>
                       <div className="ml-5 text-sm text-gray-500">
                         <p>{order.pickupbuilding_name}, {order.pickupstreet_name}</p>
                         <p>{order.pickupcounty}</p>
                         {order.pickupnearest_landmark && (
                           <p className="text-gray-400">Near: {order.pickupnearest_landmark}</p>
                         )}
                       </div>
                     </div>
                   </div>
                   <div className="mt-4 sm:mt-0 space-y-3">
                     <div>
                       <h4 className="text-sm font-medium text-gray-900">Receiver Details</h4>
                       <div className="mt-1 flex items-center text-sm text-gray-500">
                         <MapPin className="h-4 w-4 mr-1" />
                         <span>{order.receiverName}</span>
                       </div>
                       <div className="ml-5 text-sm text-gray-500">
                         <p>{order.delivery_building_name}, {order.delivery_street_name}</p>
                         <p>{order.deliverCounty}</p>
                         {order.delivery_nearest_landmark && (
                           <p className="text-gray-400">Near: {order.delivery_nearest_landmark}</p>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
                 <div className="mt-4 flex justify-between items-center">
                   <div className="text-sm text-gray-500">
                     Created: {new Date(order.created_at).toLocaleDateString()}
                   </div>
                   <button
                     type="button"
                     onClick={(e) => {
                       e.stopPropagation();
                       navigate(`/cashier/orders/${order.order_id}`);
                     }}
                     className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-900"
                   >
                     Update Cost
                   </button>
                 </div>
               </div>
             </li>
           ))}
         </ul>
        )}
        {!loading && orders.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pending orders</h3>
            <p className="mt-1 text-sm text-gray-500">There are no orders waiting for cost updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderCostUpdate;