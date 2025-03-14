import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, MapPin, ArrowRight, ArrowLeft, Box } from 'lucide-react';
//import api from '../../config/axios';
import { getPickupTasks, getDeliveryTasks } from  '../../../services/api';

const CountyDriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('collect');
  const [orders, setOrders] = useState({
    toCollect: [],
    toDeliver: [],
    selectedCollections: [],
    selectedDeliveries: []
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
        
      const county = JSON.parse(sessionStorage.getItem('user')).county;
      console.log(county);
      const [collectResponse, deliverResponse] = await Promise.all([
        getPickupTasks(county),
        getDeliveryTasks(county)
      ]);
      
      setOrders(prev => ({
        ...prev,
        toCollect: collectResponse.data.orders,
        toDeliver: deliverResponse.data.orders
      }));
    } catch (err) {
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };


  const handleOrderSelect = (orderId, type) => {
    setOrders(prev => {
      if (type === 'collect') {
        const order = prev.toCollect.find(o => o.id === orderId);
        return {
          ...prev,
          selectedCollections: [...prev.selectedCollections, order],
          toCollect: prev.toCollect.filter(o => o.id !== orderId)
        };
      } else {
        const order = prev.toDeliver.find(o => o.id === orderId);
        setSelectedOrder(null);
        return {
          ...prev,
          selectedDeliveries: [...prev.selectedDeliveries, order],
          toDeliver: prev.toDeliver.filter(o => o.id !== orderId)
        };
      }
    });
  };

  const handleViewOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const handleSelectDelivery = (order) => {
    handleOrderSelect(order.id || order.order_id, 'deliver');
  };

  const handleBackToList = () => {
    setSelectedOrder(null);
  };

  const renderOrderDetails = (order) => {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Orders
          </button>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order #{order.id || order.order_id}</h3>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Ready for Delivery
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Delivery Location</h4>
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-1" />
              <div>
                <p className="text-gray-900">{order.delivery_building || order.receiver_building}</p>
                <p className="text-gray-600">{order.delivery_street || order.receiver_street}</p>
                <p className="text-gray-600">{order.delivery_city || order.receiver_city}</p>
                {order.delivery_landmark && (
                  <p className="text-gray-500 text-sm mt-1">Near: {order.delivery_landmark}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Receiver Details</h4>
            <div className="space-y-2">
              <p className="text-gray-900">{order.receiver_name}</p>
              <p className="text-gray-600">{order.receiver_phone}</p>
              <p className="text-gray-600">{order.receiver_email}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Parcel Details</h4>
          <div className="space-y-4">
            {order.parcels && order.parcels.map((parcel, index) => (
              <div key={index} className="flex items-start border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                <Box className="h-5 w-5 text-gray-400 mr-2 mt-1" />
                <div>
                  <p className="text-gray-900">{parcel.description}</p>
                  <div className="flex space-x-4 mt-1 text-sm text-gray-600">
                    <span>Weight: {parcel.weight}kg</span>
                    <span>Pieces: {parcel.pieces}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={() => handleSelectDelivery(order)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
          >
            <ArrowRight className="h-5 w-5 mr-2" />
            Select for Delivery
          </button>
          <button
            onClick={() => handleConfirmDelivery(order.id || order.order_id)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Complete Delivery
          </button>
        </div>
      </div>
    );
  };


  const handleConfirmPickup = async (orderId) => {
    try {
      await api.post(`/driver/county/confirm-pickup/${orderId}`);
      setOrders(prev => ({
        ...prev,
        selectedCollections: prev.selectedCollections.filter(o => o.id !== orderId)
      }));
    } catch (err) {
      setError(err.message || 'Failed to confirm pickup');
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      await api.post(`/driver/county/confirm-delivery/${orderId}`);
      setSelectedOrder(null);
      setOrders(prev => ({
        ...prev,
        selectedDeliveries: prev.selectedDeliveries.filter(o => o.id !== orderId)
      }));
      setActiveTab('deliver');
    } catch (err) {
      setError(err.message || 'Failed to confirm delivery');
    }
  };

  const renderOrderCard = (order, type, onAction) => {
    const showPickup = type === 'select' && activeTab === 'collect' || type === 'pickup';
    const showDelivery = type === 'select' && activeTab === 'deliver' || type === 'delivery';
    const orderId = order.order_id;

    return (
      <div key={orderId} className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <Package className="h-4 w-4 text-gray-400 mr-1.5" />
            <span className="font-medium text-gray-900">#{orderId}</span>
          </div>
          <button
            onClick={() => onAction(orderId)}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
          >
            {type === 'select' ? (
              <span className="flex items-center">
                Select <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </span>
            ) : type === 'pickup' ? (
              'Confirm Pickup'
            ) : (
              'Confirm Delivery'
            )}
          </button>
        </div>
        {showPickup && (
          <div className="flex items-start mt-2">
            <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-700">Pickup Location</p>
              <div className="text-gray-600">
                <p>{order.pickup_building || order.pickupbuilding_name}</p>
                <p>{order.pickup_street || order.pickupstreet_name}</p>
                <p className="text-gray-500">{order.pickup_city || order.pickupcounty}</p>
              </div>
            </div>
          </div>
        )}
        {showDelivery && (
          <div className="flex items-start mt-2">
            <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-700">Delivery Location</p>
              <div className="text-gray-600">
                <p>{order.delivery_building}</p>
                <p>{order.delivery_street}</p>
                <p className="text-gray-500">{order.delivery_city}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'collect', label: 'Orders to Collect', icon: Package },
    { id: 'deliver', label: 'Orders to Deliver', icon: Truck },
    { id: 'confirm-pickup', label: 'Confirm Pickup', icon: CheckCircle },
    { id: 'confirm-delivery', label: 'Confirm Delivery', icon: CheckCircle }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">County Driver Dashboard</h1>
        <p className="mt-1 text-gray-600">Manage your pickups and deliveries</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activeTab === 'collect' && orders.toCollect.map(order =>
            renderOrderCard(order, 'select', id => handleOrderSelect(id, 'collect'))
          )}
          
          {activeTab === 'deliver' && orders.toDeliver.map(order =>
            renderOrderCard(order, 'select', () => handleViewOrderDetails(order))
          )}
          
          {activeTab === 'confirm-pickup' && orders.selectedCollections.map(order => (
            <div key={order.id || order.order_id} className="w-full md:w-80">
              {renderOrderCard(order, 'pickup', handleConfirmPickup)}
            </div>
          ))}
          
          {activeTab === 'confirm-delivery' && !selectedOrder && orders.selectedDeliveries.map(order => (
            <div key={order.id || order.order_id} className="w-full md:w-80">
              {renderOrderCard(order, 'delivery', () => handleViewOrderDetails(order))}
            </div>
          ))}

          {activeTab === 'confirm-delivery' && selectedOrder && (
            <div className="col-span-2">
              {renderOrderDetails(selectedOrder)}
            </div>
          )}

          {((activeTab === 'collect' && orders.toCollect.length === 0) ||
            (activeTab === 'deliver' && orders.toDeliver.length === 0) ||
            (activeTab === 'confirm-pickup' && orders.selectedCollections.length === 0) ||
            (activeTab === 'confirm-delivery' && orders.selectedDeliveries.length === 0)) && (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
              <p className="mt-1 text-sm text-gray-500">
                There are no orders available in this section
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountyDriverDashboard;