import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, Package, Calendar, Download,
  ArrowUp, ArrowDown, Truck, DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/authContext';
/*import {
  getOrderStats,
  getDriverStats,
  getRevenueStats,
  getCustomerStats
} from '../../services/api';
*/
const Reports = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    orders: null,
    drivers: null,
    revenue: null,
    customers: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, drivers, revenue, customers] = await Promise.all([
        getOrderStats(user.county, dateRange),
        getDriverStats(user.county, dateRange),
        getRevenueStats(user.county, dateRange),
        getCustomerStats(user.county, dateRange)
      ]);

      setStats({
        orders: orders.data,
        drivers: drivers.data,
        revenue: revenue.data,
        customers: customers.data
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, change, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-red-50 rounded-lg">
          <Icon className="h-6 w-6 text-red-600" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center ${
            change >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span className="ml-1">{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-900">{value}</h3>
        <p className="text-sm text-gray-500">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Report</h1>
          <p className="text-gray-600">Overview of county operations and performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <Download className="h-5 w-5 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading statistics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Orders"
              value={stats.orders?.total || 0}
              icon={Package}
              change={stats.orders?.change}
              subtitle="Past 30 days"
            />
            <StatCard
              title="Active Drivers"
              value={stats.drivers?.active || 0}
              icon={Truck}
              subtitle={`${stats.drivers?.deliveries || 0} deliveries today`}
            />
            <StatCard
              title="Revenue"
              value={`KES ${stats.revenue?.total || 0}`}
              icon={DollarSign}
              change={stats.revenue?.change}
              subtitle="Monthly revenue"
            />
            <StatCard
              title="New Customers"
              value={stats.customers?.new || 0}
              icon={Users}
              change={stats.customers?.change}
              subtitle="This month"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Status Distribution */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
              <div className="space-y-4">
                {stats.orders?.statusDistribution?.map(status => (
                  <div key={status.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{status.name}</span>
                      <span className="font-medium">{status.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{ width: `${status.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Performance */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Top Performing Drivers</h3>
              <div className="space-y-4">
                {stats.drivers?.topPerformers?.map(driver => (
                  <div key={driver.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Truck className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{driver.name}</p>
                        <p className="text-sm text-gray-500">{driver.deliveries} deliveries</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {driver.rating}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Trends */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
              <div className="space-y-4">
                {stats.revenue?.trends?.map(trend => (
                  <div key={trend.date} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{trend.date}</p>
                      <p className="text-sm text-gray-500">{trend.orders} orders</p>
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      KES {trend.amount}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Insights */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Customer Insights</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Repeat Customers</p>
                    <p className="text-xl font-semibold text-gray-900">
                      {stats.customers?.repeat || 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Avg. Order Value</p>
                    <p className="text-xl font-semibold text-gray-900">
                      KES {stats.customers?.avgOrderValue || 0}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Popular Destinations</h4>
                  {stats.customers?.popularDestinations?.map(dest => (
                    <div key={dest.location} className="flex justify-between text-sm py-2">
                      <span className="text-gray-600">{dest.location}</span>
                      <span className="font-medium">{dest.count} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;