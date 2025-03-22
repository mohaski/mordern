import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, MapPin, ArrowRight, ChevronLeft, Wallet, CreditCard, Box, Warehouse } from 'lucide-react';
//import api from '../../config/axios';
import { getPickupTasks, getDeliveryTasks, getParcelDetails, confirmPickup, confirmDelivery} from '../../../services/api';

const STORAGE_KEY = 'driverDashboardState';

const CountyDriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('collect');
  const [orders, setOrders] = useState(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    const parsedState = savedState ? JSON.parse(savedState) : {};
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

  // Save orders state to localStorage whenever it changes and log for debugging
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    console.log('Saved to localStorage:', JSON.parse(localStorage.getItem(STORAGE_KEY)));
  }, [orders]);

  // Set up periodic fetching
  useEffect(() => {
    fetchOrders(); // Initial fetch
    
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // Fetch every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Clear selected order and viewing section when tab changes
  useEffect(() => {
    setSelectedOrder(null);
    setViewingSection(null);
  }, [activeTab]);

  const fetchOrders = async () => {
    try {
      const county = JSON.parse(sessionStorage.getItem('user')).county;
      const [collectResponse, deliverResponse] = await Promise.all([
        getPickupTasks(county),
        getDeliveryTasks(county)
      ]);
      
      setOrders(prev => ({
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
        const order = prev.toCollect.find(o => o.order_id === orderId);
        setSelectedOrder(null);
        return {
          ...prev,
          selectedCollections: [...prev.selectedCollections, order],
          toCollect: prev.toCollect.filter(o => o.order_id !== orderId)
        };
      } else {
        const order = prev.toDeliver.find(o => o.order_id === orderId);
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
    const parcels = (await getParcelDetails(order.order_id)).data.parcels;
    setParcels([...parcels]);
  };

  const handleViewOrderDetails = (order) => {
    setViewingSection(activeTab);
    handleParcelDetails(order);
    setSelectedOrder(order);
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

      console.log(paymentMethod)

      const attendingCountyOffice = JSON.parse(sessionStorage.getItem('user')).user_id

      await confirmDelivery(selectedOrder.order_id, attendingCountyOffice, String(paymentMethod));
      setSelectedOrder(null);
      setOrders(prev => ({
        ...prev,
        selectedDeliveries: prev.selectedDeliveries.filter(o => o.order_id !== orderId)
      }));
      setPaymentMethod(null);
      setShowPaymentModal(false);
      setProcessingOrder(null);
      setActiveTab('deliver');
    } catch (err) {
      setError(err.message || 'Failed to confirm delivery');
    }
  };

  const handleConfirmDropoff = async () => {
    try {
      setLoading(true);
      const orderIds = orders.collected.map(order => order.order_id);
      await Promise.all(
        orderIds.map(orderId => api.post(`/driver/county/confirm-dropoff/${orderId}`))
      );
      setOrders(prev => ({
        ...prev,
        collected: []
      }));
      setActiveTab('collect');
    } catch (err) {
      setError(err.message || 'Failed to confirm dropoff');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = () => {
    if (!processingOrder) return;
    
    if (processingOrder.type === 'pickup') {
      handleConfirmPickup(processingOrder.id);
    } else {
      handleConfirmDelivery(processingOrder.id);
    }
  };

  const PaymentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Payment Method</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`p-4 border rounded-lg flex flex-col items-center ${
              paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          >
            <Wallet className="h-6 w-6 mb-2 text-gray-600" />
            <span className="text-sm font-medium">Cash</span>
          </button>
          <button
            onClick={() => setPaymentMethod('mpesa')}
            className={`p-4 border rounded-lg flex flex-col items-center ${
              paymentMethod === 'mpesa' ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}
          >
            <CreditCard className="h-6 w-6 mb-2 text-gray-600" />
            <span className="text-sm font-medium">M-Pesa</span>
          </button>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => {
              setShowPaymentModal(false);
              setPaymentMethod(null);
              setProcessingOrder(null);
            }}
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
          <div className="flex items-center">
            <Package className="h-4 w-4 text-gray-400 mr-1.5" />
            <span className="font-medium text-gray-900">#{orderId}</span>
          </div>
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

    const requiresPaymentOnPickup = isPickupSection && order.payment_time === 'on-pickup' && activeTab === 'confirm-pickup';
    const requiresPaymentOnDelivery = !isPickupSection && order.payment_time === 'on-delivery' && activeTab === 'confirm-delivery';

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={() => {
              setSelectedOrder(null);
              setViewingSection(null);
            }}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back to Orders
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order #{order.order_id}</h3>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            {isPickupSection ? 'Ready for Pickup' : 'Ready for Delivery'}
          </div>
          {(requiresPaymentOnPickup || requiresPaymentOnDelivery) && (
            <div className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Payment Required
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">
              {isPickupSection ? 'Pickup Location' : 'Delivery Location'}
            </h4>
            <div className="flex items-start">
              <MapPin className="h-4 w-4 text-gray-400 mr-1.5 mt-0.5" />
              <div>
                <p className="text-gray-900">
                  {isPickupSection ? order.pickupbuilding_name : order.delivery_building_name}
                </p>
                <p className="text-gray-600">
                  {isPickupSection ? order.pickupstreet_name : order.delivery_street_name}
                </p>
                <p className="text-gray-600">
                  {isPickupSection ? order.pickupcounty : order.deliverCounty}
                </p>
                {(isPickupSection ? order.pickupnearest_landmark : order.delivery_nearest_landmark) && (
                  <p className="text-gray-500 text-sm mt-1">
                    Near: {isPickupSection ? order.pickupnearest_landmark : order.delivery_nearest_landmark}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">
              {isPickupSection ? 'Sender Details' : 'Receiver Details'}
            </h4>
            <div className="space-y-2">
              <p className="text-gray-900">
                {isPickupSection ? order.SenderName : order.receiverName}
              </p>
              <p className="text-gray-600">
                {isPickupSection ? order.SenderPhone_number : order.receiverPhone_number}
              </p>
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

        {(requiresPaymentOnPickup || requiresPaymentOnDelivery) && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Payment Method</h4>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 border rounded-lg flex flex-col items-center ${
                  paymentMethod === 'cash' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              >
                <Wallet className="h-6 w-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('mpesa')}
                className={`p-4 border rounded-lg flex flex-col items-center ${
                  paymentMethod === 'mpesa' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                }`}
              >
                <CreditCard className="h-6 w-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">M-Pesa</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          {showSelectButton && (
            <button
              onClick={() => handleOrderSelect(order.order_id, isPickupSection ? 'collect' : 'deliver')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <ArrowRight className="h-5 w-5 mr-2" />
              {isPickupSection ? 'Select for Pickup' : 'Select for Delivery'}
            </button>
          )}
          {showConfirmButton && (
            <button
              onClick={() => {
                if (isPickupSection) {
                  handleConfirmPickup(order.order_id);
                } else {
                  handleConfirmDelivery(order.order_id);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {isPickupSection ? 'Confirm Pickup' : 'Confirm Delivery'}
              {(requiresPaymentOnPickup || requiresPaymentOnDelivery) && paymentMethod && (
                <span className="ml-2 text-sm">({paymentMethod})</span>
              )}
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

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading orders...</p>
          </div>
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
                        <button
                          onClick={handleConfirmDropoff}
                          className="px-8 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center text-base"
                        >
                          <Warehouse className="h-6 w-6 mr-3" />
                          Confirm Dropoff ({orders.collected.length})
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg">
                      <Warehouse className="mx-auto h-14 w-14 text-gray-400" />
                      <h3 className="mt-4 text-base font-medium text-gray-900">No orders to drop off</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Confirm pickups first to see orders here
                      </p>
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
                  <p className="mt-1 text-sm text-gray-500">
                    There are no orders available in this section
                  </p>
                </div>
              )}
            </div>
          
            {selectedOrder && (
              <div className="mt-6 border-t pt-6">
                {renderOrderDetails(selectedOrder)}
              </div>
            )}
          </>
        )}
      </div>
      {showPaymentModal && <PaymentModal />}
    </div>
  );
};

export default CountyDriverDashboard;