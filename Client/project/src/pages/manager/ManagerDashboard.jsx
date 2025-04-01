import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
import { getOrderManagerOrders } from '../../services/api';

const ManagerDashboard = () => {
  const { user } = useAuth(); // Get the logged-in user (includes county)
  const [dashboardData, setDashboardData] = useState({
    stats: {
      total_orders: 0,
      pending_orders: 0,
    },
    pendingOrders: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch and process orders
  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const county = JSON.parse(sessionStorage.getItem('user')).county
      const user_id = JSON.parse(sessionStorage.getItem('user'))?.id

      console.log(user_id);

      // Fetch orders for the user's county
      const orders = ((await getOrderManagerOrders(county)).data.orders);
      console.log(orders)

      // Compute stats from orders
      const stats = {
        total_orders: orders.filter(order => order.served_by === `${user_id}`).length,
        pending_orders: orders.filter(order => order.status === 'Pending Cost Calculation').length,
      };

      // Get the 5 most recent orders (or adjust as needed)
      const pendingOrders = orders
      .filter(order => order.status === 'Pending Cost Calculation') // Filter only relevant orders
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by updated_at descending
      .slice(0, 5); // Take the top 5

      console.log(pendingOrders)
      setDashboardData({
        stats,
        pendingOrders,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch orders on mount and every minute
  useEffect(() => {
    // Initial fetch
    fetchOrders();

    // Set up interval to fetch every minute (60 seconds)
    const intervalId = setInterval(fetchOrders, 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [user.county]); // Re-run if user.county changes

  const statusBadge = (status) => {
    const statusStyles = {
      'Pending Cost Calculation': 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          statusStyles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
      </span>
    );
  };

  if (isLoading && !dashboardData.pendingOrders.length) {
    return <div className="text-center p-8">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="text-center p-8 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of orders and operations</p>
          </div>
          <Link
            to="/cashier/create-order"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
          >
            <Package className="h-5 w-5 mr-2" />
            New Walk-in Order
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard
            icon={<Package className="h-6 w-6" />}
            title="Total Orders"
            value={dashboardData.stats.total_orders}
          />
          <DashboardCard
            icon={<Clock className="h-6 w-6" />}
            title="Pending Orders"
            value={dashboardData.stats.pending_orders}
          />
          
        </div>

        {/* Pending Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader>Order ID</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Status</TableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.pendingOrders.map(order => (
                  <tr key={order.id}>
                    <TableCell>#{order.order_id}</TableCell>
                    <TableCell>{order.SenderName}</TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                   
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Reusable components
const DashboardCard = ({ icon, title, value }) => (
  <div className="bg-white overflow-hidden shadow rounded-lg p-5">
    <div className="flex items-center">
      <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg">
        {React.cloneElement(icon, { className: 'h-6 w-6 text-red-600' })}
      </div>
      <div className="ml-4">
        <dt className="text-sm font-medium text-gray-500">{title}</dt>
        <dd className="mt-1 text-2xl font-semibold text-gray-900">{value || 0}</dd>
      </div>
    </div>
  </div>
);

const TableHeader = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
    {children}
  </th>
);

const TableCell = ({ children }) => (
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{children}</td>
);

export default ManagerDashboard;