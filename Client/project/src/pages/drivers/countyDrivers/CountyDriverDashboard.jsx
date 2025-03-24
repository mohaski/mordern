import React, { useState, useEffect, useRef } from 'react';
import { Package, Truck, CheckCircle, MapPin, ArrowRight, ChevronLeft, Wallet, CreditCard, Box, Warehouse } from 'lucide-react';
import { getPickupTasks, getDeliveryTasks, getParcelDetails, confirmPickup, confirmDelivery, confirmPickupDropoff } from '../../../services/api';

const STORAGE_KEY = 'driverDashboardState';

// Utility to sanitize order objects for JSON serialization
const sanitizeOrders = (orders) => {
  return JSON.parse(JSON.stringify(orders, (key, value) => 
    value === undefined ? null : value
  ));
};

const CountyDriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('collect');
  const [orders, setOrders] = useState(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    const parsedState = savedState ? JSON.parse(savedState) : {};
    console.log('Loaded from localStorage:', parsedState);
    return {
      toCollect: parsedState.toCollect || [],
      toDeliver: parsedState.toDeliver || [],
      selectedCollections: parsedState.selectedCollections || [],
      selectedDeliveries: parsedState.selectedDeliveries || [],
      collected: parsedState.collected || []
    };
  });
  const [parcels, setParcels] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingSection, setViewingSection] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(null);
  const lastFetchTime = useRef(0);
  const FETCH_INTERVAL = 30000; // 30 seconds

  // Save orders to localStorage with debouncing and sanitization
  useEffect(() => {
    const handler = setTimeout(() => {
      const sanitizedOrders = sanitizeOrders(orders);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedOrders));
        console.log('Saved to localStorage:', sanitizedOrders);
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
        setError('Local storage unavailable. Data may not persist on refresh.');
      }
    }, 1000); // Debounce by 1 second
    return () => clearTimeout(handler);
  }, [orders]);

  // Fetch orders periodically with stability check
  useEffect(() => {
    const fetchAndSetOrders = async () => {
      await fetchOrders();
    };
    fetchAndSetOrders();
    const interval = setInterval(fetchAndSetOrders, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Clear selected order and viewing section on tab change
  useEffect(() => {
    setSelectedOrder(null);
    setViewingSection(null);
  }, [activeTab]);

  const fetchOrders = async () => {
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_INTERVAL - 1000) return; // Avoid overlap
    lastFetchTime.current = now;

    try {
      const county = JSON.parse(sessionStorage.getItem('user'))?.county;
      console.log(county);
      if (!county) throw new Error('County not found in session storage');
      
      const [collectResponse, deliverResponse] = await Promise.all([
        getPickupTasks(county),
        getDeliveryTasks(county),
      ]);

      setOrders(prev => {
        const newState = {
          selectedCollections: prev.selectedCollections,
          selectedDeliveries: prev.selectedDeliveries,
          collected: prev.collected,
          toCollect: collectResponse.data.orders.filter(newOrder => 
            !prev.selectedCollections.some(selected => selected.order_id === newOrder.order_id) &&
            !prev.collected.some(collected => collected.order_id === newOrder.order_id)
          ),
          toDeliver: deliverResponse.data.orders.filter(newOrder =>
            !prev.selectedDeliveries.some(selected => selected.order_id === newOrder.order_id)
          )
        };
        console.log('Updated orders after fetch:', newState);
        return newState;
      });
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId, type) => {
    setOrders(prev => {
      if (type === 'collect') {
        const order = prev.toCollect.find(o => o.order_id === orderId);
        console.log('Selected for collection:', order);
        setSelectedOrder(null);
        return {
          ...prev,
          selectedCollections: [...prev.selectedCollections, order],
          toCollect: prev.toCollect.filter(o => o.order_id !== orderId)
        };
      } else {
        const order = prev.toDeliver.find(o => o.order_id === orderId);
        console.log('Selected for delivery:', order);
        setSelectedOrder(null);
        return {
          ...prev,
          selectedDeliveries: [...prev.selectedDeliveries, order],
          toDeliver: prev.toDeliver.filter(o => o.order_id !== orderId)
        };
      }
    });
  };

  const handleParcelDetails = async (order) => {
    try {
      const response = await getParcelDetails(order.order_id);
      setParcels(response.data.parcels || []);
      console.log('Parcel details fetched:', response.data.parcels);
    } catch (err) {
      console.error('Parcel details error:', err);
      setError('Failed to fetch parcel details: ' + err.message);
      setParcels([]);
    }
  };

  const handleViewOrderDetails = (order) => {
    setViewingSection(activeTab);
    handleParcelDetails(order);
    setSelectedOrder(order);
    console.log('Viewing order details:', order);
  };

  const handleConfirmPickup = async (orderId) => {
    try {
      if (selectedOrder.payment_time === 'on-pickup' && !paymentMethod) {
        setProcessingOrder({ id: orderId, type: 'pickup' });
        setShowPaymentModal(true);
        return;
      }

      const attendingCountyOffice = JSON.parse(sessionStorage.getItem('user')).user_id
      
      await confirmPickup(selectedOrder.order_id, attendingCountyOffice );
      setOrders(prev => {
        const order = prev.selectedCollections.find(o => o.order_id === orderId);
        return {
          ...prev,
          selectedCollections: prev.selectedCollections.filter(o => o.order_id !== orderId),
          collected: [...prev.collected, order]
        };
      });
      setPaymentMethod(null);
      setShowPaymentModal(false);
      setProcessingOrder(null);
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message || 'Failed to confirm pickup');
    }
  };

  const handleConfirmDelivery = async (orderId) => {
    try {
      if (selectedOrder.payment_time === 'on-delivery' && !paymentMethod) {
        setProcessingOrder({ id: orderId, type: 'delivery' });
        setShowPaymentModal(true);
        return;
      }

      const attendingCountyOffice = JSON.parse(sessionStorage.getItem('user'))?.id;
      if (!attendingCountyOffice) throw new Error('User ID not found in session storage');

      await confirmDelivery(selectedOrder.order_id, attendingCountyOffice, String(paymentMethod));
      setOrders(prev => {
        console.log('Confirmed delivery for order:', orderId);
        return {
          ...prev,
          selectedDeliveries: prev.selectedDeliveries.filter(o => o.order_id !== orderId)
        };
      });
      setPaymentMethod(null);
      setShowPaymentModal(false);
      setProcessingOrder(null);
      setSelectedOrder(null);
      setActiveTab('deliver');
    } catch (err) {
      console.error('Confirm delivery error:', err);
      setError(err.message || 'Failed to confirm delivery');
    }
  };

  const handleConfirmDropoff = async () => {
    try {
      setLoading(true);

      await confirmPickupDropoff(orders.collected)

      setOrders(prev => {
        return { ...prev, collected: [] };
      });
      setActiveTab('collect');
    } catch (err) {
      console.error('Confirm dropoff error:', err);
      setError(err.message || 'Failed to confirm dropoff');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = () => {
    if (!processingOrder) return;
    processingOrder.type === 'pickup' 
      ? handleConfirmPickup(processingOrder.id) 
      : handleConfirmDelivery(processingOrder.id);
  };

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Payment Method</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 border rounded-lg flex flex-col items-center ${paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
          >
            <Wallet className="h-6 w-6 mb-2 text-gray-600" />
            <span className="text-sm font-medium">Cash</span>
          </button>
          <button
            onClick={() => setPaymentMethod('mpesa')}
            className={`p-4 border rounded-lg flex flex-col items-center ${paymentMethod === 'mpesa' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
          >
            <CreditCard className="h-6 w-6 mb-2 text-gray-600" />
            <span className="text-sm font-medium">M-Pesa</span>
          </button>
        </div>
        <div className="flex justify-end space-x-4">
          <button 
            onClick={() => { setShowPaymentModal(false); setPaymentMethod(null); setProcessingOrder(null); }} 
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button 
            onClick={handlePaymentConfirm} 
            disabled={!paymentMethod} 
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );

  const renderOrderCard = (order, type, onAction) => {
    const showPickup = type === 'select' && activeTab === 'collect' || type === 'pickup' || type === 'dropoff';
    const showDelivery = type === 'select' && activeTab === 'deliver' || type === 'delivery';
    const orderId = order.order_id;

    return (
      <div
        key={orderId}
        onClick={() => onAction && onAction(order)}
        className="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center mb-2">
          <Package className="h-4 w-4 text-gray-400 mr-1.5" />
          <span className="font-medium text-gray-900">#{orderId}</span>
        </div>
        {showPickup && (
          <div className="flex items-start mt-2">
            <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-gray-700">Pickup Location</p>
              <div className="text-gray-600">
                <p>{order.pickupbuilding_name}</p>
                <p>{order.pickupstreet_name}</p>
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
                <p>{order.delivery_building_name}</p>
                <p>{order.delivery_street_name}</p>
              </div>
            </div>
          </div>
        )}
        {onAction && (
          <div className="flex justify-end mt-2">
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </div>
    );
  };

  const renderOrderDetails = (order) => {
    const isPickupSection = activeTab === 'collect' || activeTab === 'confirm-pickup';
    const showSelectButton = (viewingSection === 'collect' && activeTab === 'collect') || (viewingSection === 'deliver' && activeTab === 'deliver');
    const showConfirmButton = activeTab === 'confirm-pickup' || activeTab === 'confirm-delivery';
    const requiresPayment = (isPickupSection && order.payment_time === 'on-pickup' && activeTab === 'confirm-pickup') || 
                           (!isPickupSection && order.payment_time === 'on-delivery' && activeTab === 'confirm-delivery');

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <button onClick={() => { setSelectedOrder(null); setViewingSection(null); }} className="flex items-center text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5 mr-2" /> Back to Orders
          </button>
        </div>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order #{order.order_id}</h3>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {isPickupSection ? 'Ready for Pickup' : 'Ready for Delivery'}
          </div>
          {requiresPayment && (
            <div className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Payment Required
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">{isPickupSection ? 'Pickup Location' : 'Delivery Location'}</h4>
            <div className="flex items-start">
              <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" />
              <div>
                <p className="text-gray-900">{isPickupSection ? order.pickupbuilding_name : order.delivery_building_name}</p>
                <p className="text-gray-600">{isPickupSection ? order.pickupstreet_name : order.delivery_street_name}</p>
                <p className="text-gray-600">{isPickupSection ? order.pickupcounty : order.deliverCounty}</p>
                {(isPickupSection ? order.pickupnearest_landmark : order.delivery_nearest_landmark) && (
                  <p className="text-gray-500 text-sm mt-1">Near: {isPickupSection ? order.pickupnearest_landmark : order.delivery_nearest_landmark}</p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">{isPickupSection ? 'Sender Details' : 'Receiver Details'}</h4>
            <div className="space-y-2">
              <p className="text-gray-900">{isPickupSection ? order.SenderName : order.receiverName}</p>
              <p className="text-gray-600">{isPickupSection ? order.SenderPhone_number : order.receiverPhone_number}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Parcel Details</h4>
          <div className="space-y-4">
            {parcels.map((parcel, index) => (
              <div key={index} className="flex items-start border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                <Box className="h-5 w-5 text-gray-400 mr-2 mt-1" />
                <div>
                  <p className="text-gray-900">{parcel.content}</p>
                  <div className="flex space-x-4 mt-1 text-sm text-gray-600">
                    <span>Weight: {parcel.weight}kg</span>
                    <span>Pieces: {parcel.number_of_pieces}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {requiresPayment && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setPaymentMethod('cash')} className={`p-4 border rounded-lg flex flex-col items-center ${paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <Wallet className="h-6 w-6 mb-2 text-gray-600" /><span className="text-sm font-medium">Cash</span>
              </button>
              <button onClick={() => setPaymentMethod('mpesa')} className={`p-4 border rounded-lg flex flex-col items-center ${paymentMethod === 'mpesa' ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
                <CreditCard className="h-6 w-6 mb-2 text-gray-600" /><span className="text-sm font-medium">M-Pesa</span>
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-end space-x-4">
          {showSelectButton && (
            <button onClick={() => handleOrderSelect(order.order_id, isPickupSection ? 'collect' : 'deliver')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center">
              <ArrowRight className="h-5 w-5 mr-2" /> {isPickupSection ? 'Select for Pickup' : 'Select for Delivery'}
            </button>
          )}
          {showConfirmButton && (
            <button 
              onClick={() => isPickupSection ? handleConfirmPickup(order.order_id) : handleConfirmDelivery(order.order_id)} 
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5 mr-2" /> {isPickupSection ? 'Confirm Pickup' : 'Confirm Delivery'}
              {requiresPayment && paymentMethod && <span className="ml-2 text-sm">({paymentMethod})</span>}
            </button>
          )}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'collect', label: 'Orders to Collect', icon: Package },
    { id: 'deliver', label: 'Orders to Deliver', icon: Truck },
    { id: 'confirm-pickup', label: 'Confirm Pickup', icon: CheckCircle },
    { id: 'confirm-delivery', label: 'Confirm Delivery', icon: CheckCircle },
    { id: 'confirm-dropoff', label: 'Confirm Dropoff', icon: Warehouse }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">County Driver Dashboard</h1>
        <p className="mt-1 text-gray-600">Manage your pickups, deliveries, and dropoffs</p>
      </div>
      {error && <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">{error}</div>}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${activeTab === id ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                <Icon className="h-5 w-5 mr-2" /> {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12"><p className="text-gray-600">Loading orders...</p></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {activeTab === 'collect' && !selectedOrder && orders.toCollect.map(order => 
                renderOrderCard(order, 'select', () => handleViewOrderDetails(order))
              )}
              {activeTab === 'deliver' && !selectedOrder && orders.toDeliver.map(order => 
                renderOrderCard(order, 'select', () => handleViewOrderDetails(order))
              )}
              {activeTab === 'confirm-pickup' && !selectedOrder && orders.selectedCollections.map(order => (
                <div key={order.order_id} className="w-full md:w-80">
                  {renderOrderCard(order, 'pickup', () => handleViewOrderDetails(order))}
                </div>
              ))}
              {activeTab === 'confirm-delivery' && !selectedOrder && orders.selectedDeliveries.map(order => (
                <div key={order.order_id} className="w-full md:w-80">
                  {renderOrderCard(order, 'delivery', () => handleViewOrderDetails(order))}
                </div>
              ))}
              {activeTab === 'confirm-dropoff' && !selectedOrder && (
                <div className="col-span-2">
                  {orders.collected.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-6 mb-8">
                        {orders.collected.map(order => (
                          <div key={order.order_id} className="w-full md:w-96 p-2">
                            {renderOrderCard(order, 'dropoff', () => handleViewOrderDetails(order))}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-4">
                        <button onClick={handleConfirmDropoff} className="px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center text-base">
                          <Warehouse className="h-6 w-6 mr-3" /> Confirm Dropoff ({orders.collected.length})
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                      <Warehouse className="mx-auto h-14 w-14 text-gray-400" />
                      <h3 className="mt-4 text-base font-medium text-gray-900">No orders to drop off</h3>
                      <p className="mt-2 text-sm text-gray-500">Confirm pickups first to see orders here</p>
                    </div>
                  )}
                </div>
              )}
              {((activeTab === 'collect' && orders.toCollect.length === 0) || 
                (activeTab === 'deliver' && orders.toDeliver.length === 0) || 
                (activeTab === 'confirm-pickup' && orders.selectedCollections.length === 0) || 
                (activeTab === 'confirm-delivery' && orders.selectedDeliveries.length === 0) || 
                (activeTab === 'confirm-dropoff' && orders.collected.length === 0)) && !selectedOrder && (
                <div className="col-span-2 text-center py-12 bg-gray-50 rounded-lg">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
                  <p className="mt-1 text-sm text-gray-500">There are no orders available in this section</p>
                </div>
              )}
            </div>
            {selectedOrder && <div className="mt-6 border-t pt-6">{renderOrderDetails(selectedOrder)}</div>}
          </>
        )}
      </div>
      {showPaymentModal && <PaymentModal />}
    </div>
  );
};

export default CountyDriverDashboard;