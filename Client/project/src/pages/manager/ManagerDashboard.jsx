import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, TrendingUp, Clock, AlertCircle } from 'lucide-react';

const ManagerDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      total_orders: 0,
      pending_orders: 0,
      problem_orders: 0,
      completed_today: 0
    },
    recentOrders: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulated data since we don't have a backend yet
    setTimeout(() => {
      setDashboardData({
        stats: {
          total_orders: 248,
          pending_orders: 15,
          problem_orders: 3,
          completed_today: 42
        },
        recentOrders: [
          {
            id: 1,
            tracking_number: 'MC123456',
            customer_name: 'John Doe',
            status: 'pending',
            current_location: 'Nairobi'
          },
          {
            id: 2,
            tracking_number: 'MC123457',
            customer_name: 'Jane Smith',
            status: 'in_transit',
            current_location: 'Mombasa'
          }
        ]
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  const statusBadge = (status) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      problem: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (isLoading) return <div className="text-center p-8">Loading dashboard...</div>;
  if (error) return <div className="text-center p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of orders and operations</p>
          </div>
          <Link
            to="/manager/create-order"
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
          <DashboardCard 
            icon={<AlertCircle className="h-6 w-6" />}
            title="Needs Attention"
            value={dashboardData.stats.problem_orders}
          />
          <DashboardCard 
            icon={<TrendingUp className="h-6 w-6" />}
            title="Completed Today"
            value={dashboardData.stats.completed_today}
          />
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader>Order ID</TableHeader>
                  <TableHeader>Customer</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Location</TableHeader>
                  <TableHeader>Action</TableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(dashboardData.recentOrders) && dashboardData.recentOrders.map(order => (
                  <tr key={order.id}>
                    <TableCell>#{order.tracking_number}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell>{order.current_location}</TableCell>
                    <TableCell>
                      <Link 
                        to={`/orders/${order.id}`}
                        className="text-red-600 hover:text-red-900 transition-colors duration-200"
                      >
                        View Details
                      </Link>
                    </TableCell>
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
        <dd className="mt-1 text-2xl font-semibold text-gray-900">
          {value || 0}
        </dd>
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
  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
    {children}
  </td>
);

export default ManagerDashboard;