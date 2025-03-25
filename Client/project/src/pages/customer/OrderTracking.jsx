import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle } from 'lucide-react';
import { trackOrder } from '../../services/api';

const OrderTracking = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getStatusStep = (currentStatus, stepStatus) => {
    const steps = {
      'Pending Cost Calculation': 0,
      'Awaiting Confirmation': 1,
      'collected': 2,
      'In Transit': 3,
      'Delivered': 4
    };
    const currentStep = steps[currentStatus] || 0;
    const step = steps[stepStatus] || 0;

    if (step === currentStep) return 'current';
    if (step < currentStep) return 'passed';
    return 'future';
  };

  const getStepStyles = (currentStatus, stepStatus) => {
    const status = getStatusStep(currentStatus, stepStatus);
    if (status === 'current') return 'bg-green-500'; // Current step: green
    if (status === 'passed') return 'bg-blue-500';   // Passed steps: blue
    return 'bg-gray-300';                            // Future steps: gray
  };

  const getLineStyles = (currentStatus, nextStepStatus) => {
    const status = getStatusStep(currentStatus, nextStepStatus);
    if (status === 'passed' || status === 'current') return 'bg-blue-500'; // Passed or current: blue
    return 'bg-gray-300';                                                  // Future: gray
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await trackOrder(trackingNumber);
      console.log(response.data.trackedOrder);
      setOrderData(response.data.trackedOrder);
      setIsTracking(true);
    } catch (err) {
      setError(err.message || 'Failed to track order. Please check the tracking number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Track Your Package</h1>
        <p className="mt-2 text-gray-600">Enter your tracking number to get real-time updates on your delivery status</p>
      </div>

      <form onSubmit={handleTrack} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            disabled={loading}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500"
          />
          <button
            type="submit"
            disabled={loading || !trackingNumber.trim()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Search className="h-5 w-5" />
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}
      </form>

      {isTracking && orderData && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tracking Details</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                orderData.status === 'delivered' 
                  ? 'bg-green-100 text-green-800'
                  : orderData.status === 'in_transit'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {orderData.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tracking Number</p>
                <p className="font-medium">{orderData.tracking_number}</p>
              </div>
              <div>
                <p className="text-gray-500">Estimated Delivery</p>
                <p className="font-medium">{formatDate(orderData.estimated_delivery)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Package Received */}
            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStyles(orderData.status, 'pending')}`}>
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className={`flex-1 w-px my-2 ${getLineStyles(orderData.status, 'processing')}`}></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className={`font-medium ${getStatusStep(orderData.status, 'pending') !== 'future' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Package Received
                </h3>
                <p className="text-sm text-gray-500">{formatDate(orderData.created_at)}</p>
                <p className="text-sm text-gray-600 mt-1">Order confirmed and processing</p>
              </div>
            </div>

            {/* Picked Up */}
            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStyles(orderData.status, 'picked_up')}`}>
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div className={`flex-1 w-px my-2 ${getLineStyles(orderData.status, 'in_transit')}`}></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className={`font-medium ${getStatusStep(orderData.status, 'picked_up') !== 'future' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Picked Up
                </h3>
                <p className="text-sm text-gray-500">{formatDate(orderData.pickup_time)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {getStatusStep(orderData.status, 'picked_up') !== 'future'
                    ? `Package picked up from ${orderData.pickup_location}`
                    : 'Awaiting pickup'}
                </p>
              </div>
            </div>

            {/* In Transit */}
            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStyles(orderData.status, 'in_transit')}`}>
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div className={`flex-1 w-px my-2 ${getLineStyles(orderData.status, 'delivered')}`}></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className={`font-medium ${getStatusStep(orderData.status, 'in_transit') !== 'future' ? 'text-gray-900' : 'text-gray-500'}`}>
                  In Transit
                </h3>
                <p className="text-sm text-gray-500">{formatDate(orderData.transit_start_time)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {getStatusStep(orderData.status, 'in_transit') !== 'future'
                    ? `Package in transit from ${orderData.pickup_location} to ${orderData.delivery_location}`
                    : 'Awaiting transit'}
                </p>
              </div>
            </div>

            {/* Delivered */}
            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepStyles(orderData.status, 'delivered')}`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className={`font-medium ${getStatusStep(orderData.status, 'delivered') !== 'future' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Delivered
                </h3>
                <p className="text-sm text-gray-500">{formatDate(orderData.delivery_time)}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {getStatusStep(orderData.status, 'delivered') !== 'future'
                    ? `Package delivered successfully to ${orderData.delivery_location}`
                    : 'Delivery pending'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isTracking && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Track Your Package</h3>
          <p className="mt-1 text-gray-500">Enter your tracking number above to see delivery status</p>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;