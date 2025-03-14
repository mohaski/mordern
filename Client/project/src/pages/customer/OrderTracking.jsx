import React, { useState } from 'react';
import { Search, Package, Truck, MapPin, CheckCircle } from 'lucide-react';

const OrderTracking = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isTracking, setIsTracking] = useState(false);

  const handleTrack = (e) => {
    e.preventDefault();
    setIsTracking(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Track Your Package</h1>
        <p className="mt-2 text-gray-600">Enter your tracking number to get real-time updates on your delivery</p>
      </div>

      <form onSubmit={handleTrack} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="Enter tracking number"
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      {isTracking && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tracking Details</h2>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                In Transit
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tracking Number</p>
                <p className="font-medium">MC123456789</p>
              </div>
              <div>
                <p className="text-gray-500">Estimated Delivery</p>
                <p className="font-medium">March 15, 2024</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 w-px bg-green-500 my-2"></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium">Package Received</h3>
                <p className="text-sm text-gray-500">March 13, 2024 - 9:00 AM</p>
                <p className="text-sm text-gray-600 mt-1">Package received at Mombasa office</p>
              </div>
            </div>

            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 w-px bg-gray-300 my-2"></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium">In Transit</h3>
                <p className="text-sm text-gray-500">March 14, 2024 - 10:30 AM</p>
                <p className="text-sm text-gray-600 mt-1">Package in transit to Nairobi</p>
              </div>
            </div>

            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1 w-px bg-gray-300 my-2"></div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-gray-500">Out for Delivery</h3>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>

            <div className="relative flex">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="font-medium text-gray-500">Delivered</h3>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderTracking;