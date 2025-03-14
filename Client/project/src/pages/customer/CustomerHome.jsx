import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, TrendingUp } from 'lucide-react';

const CustomerHome = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Modern Cargo</span>
          <span className="block text-red-600">Reliable Delivery Solutions</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Fast, secure, and reliable courier services across the country. Send your packages with confidence.
        </p>
      </div>

      <div className="mt-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Create Order Card */}
          <Link
            to="/create-order"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                <Package className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                Create New Order
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Send your package anywhere in the country with our easy order creation process.
              </p>
            </div>
          </Link>

          {/* Track Order Card */}
          <Link
            to="/track-order"
            className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                <Search className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">
                <span className="absolute inset-0" aria-hidden="true" />
                Track Order
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Monitor your package's journey in real-time with our tracking system.
              </p>
            </div>
          </Link>

          {/* Service Coverage Card */}
          <div className="relative group bg-white p-6 rounded-lg shadow-sm">
            <div>
              <span className="rounded-lg inline-flex p-3 bg-red-50 text-red-700 ring-4 ring-white">
                <TrendingUp className="h-6 w-6" />
              </span>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-medium">Service Coverage</h3>
              <p className="mt-2 text-sm text-gray-500">
                We cover all major cities and counties across the country with reliable delivery networks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;