import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, MapPin, ArrowRight, Box, ChevronLeft, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../../contexts/authContext';
import { getParcelDetails, getDriverRoute, getOrdersToBedroppedOff, getAvailableTransfers, checkIn, directionChange, confirmPickupforTransfer, confirmDropoff } from '../../../services/api';

const TransitDriverDashboard = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dropoff');
  const [orders, setOrders] = useState({
    available: [],
    dropoff: [],
    selected: []
  });
  const [selectedOrder, setSelectedOrder] = useState(() => {
    const savedOrder = localStorage.getItem('selectedOrder');
    return savedOrder ? JSON.parse(savedOrder) : null;
  });
  const [checkedDropoffOrders, setCheckedDropoffOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkedInStatus, setCheckedInStatus] = useState(() => 
    localStorage.getItem('checkedInStatus') === 'true'
  );
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('currentLocation') || null);
  const [destination, setDestination] = useState(() => localStorage.getItem('destination') || null);
  const [isReversed, setIsReversed] = useState(() => 
    localStorage.getItem('isReversed') === 'true'
  );
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [routeStations, setRouteStations] = useState([]);
  const [reverseStations, setReverseStations] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [pickedUpOrders, setPickedUpOrders] = useState(() => {
    const savedPickedUp = localStorage.getItem('pickedUpOrders');
    return savedPickedUp ? JSON.parse(savedPickedUp) : [];
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const serializableOrder = selectedOrder ? {
      order_id: selectedOrder.order_id,
      created_at: selectedOrder.created_at,
      deliverCounty: selectedOrder.deliverCounty,
      status: selectedOrder.status,
    } : null;
    localStorage.setItem('selectedOrder', serializableOrder ? JSON.stringify(serializableOrder) : '');
  }, [selectedOrder]);

  useEffect(() => {
    localStorage.setItem('selectedOrders', JSON.stringify(orders.selected));
  }, [orders.selected]);

  useEffect(() => {
    localStorage.setItem('pickedUpOrders', JSON.stringify(pickedUpOrders));
  }, [pickedUpOrders]);

  useEffect(() => {
    localStorage.setItem('checkedInStatus', checkedInStatus.toString());
  }, [checkedInStatus]);

  useEffect(() => {
    localStorage.setItem('currentLocation', currentLocation || '');
  }, [currentLocation]);

  useEffect(() => {
    localStorage.setItem('destination', destination || '');
  }, [destination]);

  useEffect(() => {
    localStorage.setItem('isReversed', isReversed.toString());
  }, [isReversed]);

  // Fetch route data on component mount
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await getDriverRoute();
        const routeSequence = response.data.route?.sequence_order || [];
        console.log('Fetched Route:', routeSequence);

        if (Array.isArray(routeSequence) && routeSequence.length > 0) {
          setRouteStations(routeSequence);
          setReverseStations([...routeSequence].reverse());
          if (!currentLocation) setCurrentLocation(routeSequence[0]);
          if (!destination) setDestination(routeSequence[routeSequence.length - 1]);
        } else {
          setError('Invalid route data received');
          setRouteStations([]);
          setReverseStations([]);
        }
      } catch (err) {
        setError('Failed to fetch route: ' + err.message);
        setRouteStations([]);
        setReverseStations([]);
      }
    };

    fetchRoute();
  }, []);

  const handleCheckIn = async () => {
    try {
      await checkIn(currentLocation);
      setCheckedInStatus(true);

      const stations = isReversed ? reverseStations : routeStations;
      const currentIndex = stations.indexOf(currentLocation);

      if (currentIndex === stations.length - 1) {
        await directionChange();
        setIsReversed(!isReversed);
        const newStations = !isReversed ? reverseStations : routeStations;
        setCurrentLocation(newStations[0]);
        setDestination(newStations[newStations.length - 1]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (checkedInStatus && currentLocation && destination) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [checkedInStatus, currentLocation, destination]);

  const handleCheckOut = async () => {
    try {
      setIsCheckingOut(true);
      const stations = isReversed ? reverseStations : routeStations;
      const currentIndex = stations.indexOf(currentLocation);

      if (currentIndex < stations.length - 1) {
        const nextStation = stations[currentIndex + 1];
        setCurrentLocation(nextStation);
      }

      setIsCheckingOut(false);
      setCheckedInStatus(false);
      setOrders({
        available: [],
        dropoff: [],
        selected: []
      });
      setCheckedDropoffOrders([]);
      setPickedUpOrders([]); // Clear picked-up orders on checkout
    } catch (err) {
      setError(err.message);
      setIsCheckingOut(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const availableResponse = await getAvailableTransfers();
      const dropoffResponse = await getOrdersToBedroppedOff();
      console.log(dropoffResponse);
      console.log(dropoffResponse.data.dropOffs);
      setOrders(prev => {
        const filteredAvailable = Array.isArray(availableResponse.data.transfers)
          ? availableResponse.data.transfers.filter(
              order =>
                !prev.selected.some(selectedOrder => selectedOrder.order_id === order.order_id) &&
                !pickedUpOrders.includes(order.order_id)
            )
          : [];
        return {
          ...prev,
          available: filteredAvailable,
          dropoff: Array.isArray(dropoffResponse.data.dropOffs)
            ? dropoffResponse.data.dropOffs
            : [],
          selected: prev.selected
        };
      });
    } catch (err) {
      setError(err.message);
      setOrders(prev => ({
        ...prev,
        available: [],
        dropoff: [],
        selected: prev.selected // Preserve selected orders
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (orderId) => {
    try {
      const orderToSelect = orders.available.find(order => order.order_id === orderId);
      if (orderToSelect && !orders.selected.some(o => o.order_id === orderId)) {
        setOrders(prev => ({
          ...prev,
          available: prev.available.filter(order => order.order_id !== orderId),
          selected: [...prev.selected, {
            order_id: orderToSelect.order_id,
            created_at: orderToSelect.created_at,
            deliverCounty: orderToSelect.deliverCounty,
            status: orderToSelect.status,
            pickupcounty: orderToSelect.pickupcounty,
            parcels_count: orderToSelect.parcels_count,
            
          }]
        }));
      }
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirmPickup = async () => {
    try {
      if (orders.selected.length > 0) {
        const response = await confirmPickupforTransfer(orders.selected);
        if (response.status === 200) {
          setPickedUpOrders(prev => [...prev, ...orders.selected.map(order => order.order_id)]);
          setOrders(prev => ({
            ...prev,
            selected: []
          }));
          setActiveTab('dropoff');
        } else {
          setError(response.data.message || 'Failed to confirm pickup.');
        }
      }
    } catch (err) {
      setError('Failed to confirm pickup: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleDropoffCheckbox = (orderId) => {
    setCheckedDropoffOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]
    );
  };

  const handleConfirmDropoff = async () => {
    try {
      if (checkedDropoffOrders.length > 0) {
        await confirmDropoff(checkedDropoffOrders);
        setOrders(prev => ({
          ...prev,
          dropoff: prev.dropoff.filter(order => !checkedDropoffOrders.includes(order.order_id))
        }));
        setCheckedDropoffOrders([]);
        setError(null);
      } else {
        setError('No orders selected for dropoff.');
      }
    } catch (err) {
      setError('Failed to confirm dropoff: ' + err.message);
    }
  };

  const handleParcelDetails = async (order_id) => {
    try {
      const response = await getParcelDetails(order_id);
      const parcels = response.data.parcels || [];
      setParcels(parcels);
      console.log('Fetched Parcels:', parcels);
    } catch (err) {
      setError('Failed to fetch parcel details: ' + err.message);
      setParcels([]);
    }
  };

  const handleViewOrderDetails = (order) => {
    const serializableOrder = {
      order_id: order.order_id,
      created_at: order.created_at,
      deliverCounty: order.deliverCounty,
      status: order.status,
      pickupcounty: order.pickupcounty,
      estimated_delivery: order.estimated_delivery,
      parcels_count: order.parcels_count
    };
    setSelectedOrder(serializableOrder);
    handleParcelDetails(order.order_id);
  };

  const renderOrderCard = (order) => (
    <div className="flex items-center space-x-4">
      {activeTab === 'dropoff' && (
        <input
          type="checkbox"
          checked={checkedDropoffOrders.includes(order.order_id)}
          onChange={(e) => {
            e.stopPropagation();
            handleToggleDropoffCheckbox(order.order_id);
          }}
          className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
        />
      )}
      <div
        key={order.order_id}
        className="bg-white rounded-xl shadow-lg p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer border border-gray-100 flex-1"
        onClick={() => handleViewOrderDetails(order)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-red-600 mr-3" />
            <span className="font-semibold text-lg text-gray-800">#orderId {order.order_id}</span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-red-500 mr-3 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                From: <span className="text-gray-900">{order.pickupcounty}</span>
              </p>
              <p className="text-sm font-medium text-gray-700">
                To: <span className="text-gray-900">{order.deliverCounty}</span>
              </p>
              <p className="text-sm font-medium text-gray-700">
                Estmated Delivery Time: <span className="text-gray-900">{new Date(order.estimated_delivery).toLocaleString()}</span>
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-600">
              {order.parcels_count} {order.parcels_count === 1 ? 'parcel' : 'parcels'}
            </span>
            <div className="flex items-center justify-end mt-4 space-x-2">
              <span className="text-sm text-gray-700 font-medium">SELECT</span>
              <ArrowRight className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrderDetails = (order) => (
    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
      <div className="flex items-center mb-8">
        <button
          onClick={() => setSelectedOrder(null)}
          className="flex items-center text-red-600 hover:text-red-800 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 mr-2" />
          <span className="font-medium">Back to Orders</span>
        </button>
      </div>
  
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          OrderId {order.order_id}
        </h3>
        <div className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-red-50 text-red-700">
          {order.status}
        </div>
      </div>
  
      <div className="grid grid-cols-1 gap-8 mb-8">
        <div className="bg-gray-50 p-6 rounded-xl shadow-sm">
          <h4 className="font-semibold text-lg text-gray-900 mb-4">Order Information</h4>
          <div className="space-y-3">
            <p className="text-gray-800">
              Created: <span className="font-medium">{new Date(order.created_at).toLocaleString()}</span>
            </p>
            <p className="text-gray-800">
              Destination County Office: <span className="font-medium">{order.deliverCounty}</span>
            </p>
            <p className="text-sm font-medium text-gray-700">
              Estimated Delivery Time: <span className="text-gray-900">{new Date(order.estimated_delivery).toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>
  
      <div className="bg-gray-50 p-6 rounded-xl shadow-sm mb-8">
        <h4 className="font-semibold text-lg text-gray-900 mb-4">Parcel Details</h4>
        <div className="space-y-3">
          {parcels.length > 0 ? (
            parcels.map((parcel, index) => (
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
            ))
          ) : (
            <p className="text-gray-600">No parcel details available.</p>
          )}
        </div>
      </div>
  
      <div className="flex justify-end">
        {activeTab === 'available' && (
          <button
            onClick={() => handleSelectOrder(order.order_id)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Select for Transit
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <div className="mb-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transit Driver Dashboard</h1>
          {checkedInStatus ? (
            <button
              onClick={handleCheckOut}
              disabled={isCheckingOut}
              className="flex items-center px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              {isCheckingOut ? 'Processing...' : 'Check Out'}
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              className="flex items-center px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Check In
            </button>
          )}
        </div>

        {/* Route Progress Bar */}
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <Truck className="h-7 w-7 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Current Route Progress</h2>
          </div>
          <div className="relative">
            <div className="relative flex items-center h-10">
              <div className="absolute inset-y-0 flex items-center w-full" aria-hidden="true">
                <div className="h-1 w-full bg-gray-200 rounded-full"></div>
              </div>
              <div className="relative flex justify-between w-full">
                {Array.isArray(isReversed ? reverseStations : routeStations) &&
                  (isReversed ? reverseStations : routeStations).map((station) => {
                    const isActive = station === currentLocation;
                    const stations = isReversed ? reverseStations : routeStations;
                    const isPast = stations.indexOf(station) < stations.indexOf(currentLocation);
                    return (
                      <div key={station} className="relative z-10">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 transition-all duration-300 ${
                            isActive
                              ? 'border-red-600 bg-red-600 text-white shadow-lg'
                              : isPast
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-gray-200 bg-gray-200 text-gray-500'
                          }`}
                        >
                          {isPast || isActive ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <div className="h-6 w-6"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="flex justify-between mt-3">
              {Array.isArray(isReversed ? reverseStations : routeStations) &&
                (isReversed ? reverseStations : routeStations).map((station) => {
                  const isActive = station === currentLocation;
                  return (
                    <span
                      key={station}
                      className={`text-sm font-medium ${
                        isActive ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      {station.charAt(0).toUpperCase() + station.slice(1)}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <nav className="flex space-x-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'available'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Available Orders
          </button>
          <button
            onClick={() => setActiveTab('selected')}
            className={`px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'selected'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Selected Orders
          </button>
          <button
            onClick={() => setActiveTab('dropoff')}
            className={`px-4 py-3 text-sm font-semibold transition-all duration-300 ${
              activeTab === 'dropoff'
                ? 'border-b-2 border-red-600 text-red-600'
                : 'text-gray-600 hover:text-red-600'
            }`}
          >
            Confirm Dropoff
          </button>
        </nav>
      </div>

      {error && (
        <div className="mb-6 p-5 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="h-6 w-6 mr-3" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
          </div>
        ) : selectedOrder ? (
          renderOrderDetails(selectedOrder)
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTab === 'available' && (!Array.isArray(orders.available) || orders.available.length === 0) && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                <AlertCircle className="mx-auto h-14 w-14 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No Available Orders</h3>
                <p className="mt-2 text-sm text-gray-600">
                  There are no orders available for your current route.
                </p>
              </div>
            )}
            {activeTab === 'selected' && orders.selected.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                <AlertCircle className="mx-auto h-14 w-14 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No Selected Orders</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Select orders from the Available Orders tab to add them here.
                </p>
              </div>
            )}
            {activeTab === 'dropoff' && (!Array.isArray(orders.dropoff) || orders.dropoff.length === 0) && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-lg border border-gray-100">
                <AlertCircle className="mx-auto h-14 w-14 text-gray-400" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No Orders to Drop Off</h3>
                <p className="mt-2 text-sm text-gray-600">
                  There are no orders to drop off at your current location.
                </p>
              </div>
            )}
            {activeTab === 'available' &&
              Array.isArray(orders.available) &&
              orders.available.map((order) => renderOrderCard(order))}
            {activeTab === 'selected' && orders.selected.length > 0 && (
              <>
                {orders.selected.map((order) => renderOrderCard(order))}
                <div className="col-span-full flex justify-end mt-6">
                  <button
                    onClick={handleConfirmPickup}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Confirm Pickup
                  </button>
                </div>
              </>
            )}
            {activeTab === 'dropoff' && Array.isArray(orders.dropoff) && orders.dropoff.length > 0 && (
              <>
                {orders.dropoff.map((order) => renderOrderCard(order))}
                <div className="col-span-full flex justify-end mt-6">
                  <button
                    onClick={handleConfirmDropoff}
                    disabled={checkedDropoffOrders.length === 0}
                    className="px-6 py-3 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:bg-gray-400 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Confirm Dropoff
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransitDriverDashboard;