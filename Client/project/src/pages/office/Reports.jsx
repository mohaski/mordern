import React, { useState, useEffect, useMemo } from 'react';
import { useTable } from 'react-table';
import { format, subDays } from 'date-fns';
import { 
  getOrderManagers,
  getCountyDrivers,
  getOrdersByOrderManager,
  getOrdersDeliveredByDriver,
  getPendingOrders,
} from '../../services/api';

// Utility to get current datetime in 'yyyy-MM-dd HH:mm:ss' format
const getCurrentDateTime = () => {
  return format(new Date(Date.now()), 'yyyy-MM-dd HH:mm:ss');
};

const OfficeManagerReports = () => {
  const [activeTab, setActiveTab] = useState('ordersByOrderManager');
  const [ordersByOrderManagerData, setOrdersByOrderManagerData] = useState([]);
  const [ordersDeliveredByDriverData, setOrdersDeliveredByDriverData] = useState([]);
  const [pendingOrdersData, setPendingOrdersData] = useState([]);
  const [orderManagers, setOrderManagers] = useState([]);
  const [countyDrivers, setCountyDrivers] = useState([]);
  const [selectedOrderManager, setSelectedOrderManager] = useState('');
  const [selectedCountyDriver, setSelectedCountyDriver] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date Range Filter
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Fetch Order Managers for Dropdown (Same County)
  const fetchOrderManagers = async () => {
    try {
      const county = JSON.parse(sessionStorage.getItem('user')).county;
      const response = await getOrderManagers(county);
      console.log(response);
      if (response.status === 200) {
        setOrderManagers(response.data.orderManagers);
      } else {
        setError('Failed to fetch order managers');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch County Drivers for Dropdown (Same County)
  const fetchCountyDrivers = async () => {
    try {
      const county = JSON.parse(sessionStorage.getItem('user')).county;
      const response = await getCountyDrivers(county);
      if (response.status === 200) {
        setCountyDrivers(response.data.countyDrivers);
      } else {
        setError('Failed to fetch county drivers');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch Orders Worked by Order Manager
  const fetchOrdersByOrderManager = async () => { 
    setLoading(true);
    try {
      const params = {
        startDate: dateRange.startDate ? `${dateRange.startDate} 00:00:00` : getCurrentDateTime(),
        endDate: dateRange.endDate ? `${dateRange.endDate} 23:59:59` : getCurrentDateTime(),
        user_id: selectedOrderManager || undefined,
      };

      console.log("Fetching orders with params:", params);

      const response = await getOrdersByOrderManager(params.startDate, params.endDate, params.user_id);

      if (response.data.success) {
        setOrdersByOrderManagerData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch orders by order manager');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Orders Delivered by Driver
  const fetchOrdersDeliveredByDriver = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange.startDate ? `${dateRange.startDate} 00:00:00` : getCurrentDateTime(),
        endDate: dateRange.endDate ? `${dateRange.endDate} 23:59:59` : getCurrentDateTime(),
        user_id: selectedCountyDriver || undefined,
      };
      const response = await getOrdersDeliveredByDriver(params.startDate, params.endDate, params.user_id);
      if (response.data.success) {
        setOrdersDeliveredByDriverData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch orders delivered by driver');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Pending Orders
  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange.startDate ? `${dateRange.startDate} 00:00:00` : getCurrentDateTime(),
        endDate: dateRange.endDate ? `${dateRange.endDate} 23:59:59` : getCurrentDateTime(),
      };
      const response = await getPendingOrders(params);
      if (response.status === 200) {
        setPendingOrdersData(response.data.orders);
      } else {
        setError('Failed to fetch pending orders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown data on component mount
  useEffect(() => {
    fetchOrderManagers();
    fetchCountyDrivers();
  }, []);

  // Reset date range when activeTab changes
  useEffect(() => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
  }, [activeTab]);

  // Fetch report data when tab, date range, or dropdown selection changes
  useEffect(() => {
    if (activeTab === 'ordersByOrderManager') fetchOrdersByOrderManager();
    if (activeTab === 'ordersDeliveredByDriver') fetchOrdersDeliveredByDriver();
    if (activeTab === 'pendingOrders') fetchPendingOrders();
  }, [activeTab, dateRange, selectedOrderManager, selectedCountyDriver]);

  // Table Columns for Orders Worked by Order Manager
  const ordersByOrderManagerColumns = useMemo(
    () => [
      { Header: 'Order ID', accessor: 'orderId' },
      { Header: 'Created At', accessor: 'createdAt', Cell: ({ value }) => new Date(value).toLocaleString() },
      { Header: 'Total Cost ($)', accessor: 'totalCost' },
      { Header: 'Pickup Location', accessor: 'pickupLocation' },
      { Header: 'Delivery Location', accessor: 'deliveryLocation' },
      {
        Header: 'Parcel Details',
        accessor: 'parcelDetails',
        Cell: ({ value }) => (
          <div>
            {value && value.length > 0 ? (
              value.map((parcel, index) => (
                <div key={index}>
                  <p><strong>Content:</strong> {parcel.content}</p>
                  <p><strong>Weight:</strong> {parcel.weight} kg</p>
                  <p><strong>Pieces:</strong> {parcel.number_of_pieces}</p>
                  {index < value.length - 1 && <hr />}
                </div>
              ))
            ) : (
              'N/A'
            )}
          </div>
        ),
      },
    ],
    []
  );

  // Table Columns for Orders Delivered by Driver
  const ordersDeliveredByDriverColumns = useMemo(
    () => [
      { Header: 'Order ID', accessor: 'orderId' },
      { Header: 'Dropped at Office', accessor: 'droppedAt', Cell: ({ value }) => new Date(value).toLocaleString() },
      { Header: 'Estimated Delivery Time', accessor: 'estimated_delivery', Cell: ({ value }) => value !== 'N/A' ? new Date(value).toLocaleString() : 'N/A' },
      { Header: 'Delivered At', accessor: 'deliveredAt', Cell: ({ value }) => new Date(value).toLocaleString() },
    ],
    []
  );

  // Table Columns for Pending Orders
  const pendingOrdersColumns = useMemo(
    () => [
      { Header: 'Order ID', accessor: 'order_id' },
      { Header: 'Created At', accessor: 'created_at', Cell: ({ value }) => new Date(value).toLocaleString() },
    ],
    []
  );

  const ordersByOrderManagerTable = useTable({ columns: ordersByOrderManagerColumns, data: ordersByOrderManagerData });
  const ordersDeliveredByDriverTable = useTable({ columns: ordersDeliveredByDriverColumns, data: ordersDeliveredByDriverData });
  const pendingOrdersTable = useTable({ columns: pendingOrdersColumns, data: pendingOrdersData });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Office Manager Reports</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        {[
          { id: 'ordersByOrderManager', label: 'Orders by Order Manager' },
          { id: 'ordersDeliveredByDriver', label: 'Orders Delivered by Driver' },
          { id: 'pendingOrders', label: 'Pending Orders' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium ${activeTab === tab.id ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Date</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
          />
        </div>

        {/* Order Manager Dropdown */}
        {activeTab === 'ordersByOrderManager' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Order Manager (Same County)</label>
            <select
              value={selectedOrderManager}
              onChange={(e) => setSelectedOrderManager(e.target.value)}
              className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            >
              <option value="">Choose Order Managers</option>
              {orderManagers.map(manager => (
                <option key={manager.user_id} value={manager.user_id}>
                  {manager.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* County Driver Dropdown */}
        {activeTab === 'ordersDeliveredByDriver' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">County Driver (Same County)</label>
            <select
              value={selectedCountyDriver}
              onChange={(e) => setSelectedCountyDriver(e.target.value)}
              className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
            >
              <option value="">Choose County Drivers</option>
              {countyDrivers.map(driver => (
                <option key={driver.user_id} value={driver.user_id}>
                  {driver.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-6">
          {activeTab === 'ordersByOrderManager' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Orders Worked by Order Manager</h2>
              <table {...ordersByOrderManagerTable.getTableProps()} className="w-full border-collapse">
                <thead>
                  {ordersByOrderManagerTable.headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()} className="bg-gray-100">
                      {headerGroup.headers.map(column => (
                        <th {...column.getHeaderProps()} className="border p-2 text-left">
                          {column.render('Header')}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody {...ordersByOrderManagerTable.getTableBodyProps()}>
                  {ordersByOrderManagerTable.rows.map(row => {
                    ordersByOrderManagerTable.prepareRow(row);
                    return (
                      <tr {...row.getRowProps()}>
                        {row.cells.map(cell => (
                          <td {...cell.getCellProps()} className="border p-2">
                            {cell.render('Cell')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'ordersDeliveredByDriver' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Orders Delivered by Driver</h2>
              <table {...ordersDeliveredByDriverTable.getTableProps()} className="w-full border-collapse">
                <thead>
                  {ordersDeliveredByDriverTable.headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()} className="bg-gray-100">
                      {headerGroup.headers.map(column => (
                        <th {...column.getHeaderProps()} className="border p-2 text-left">
                          {column.render('Header')}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody {...ordersDeliveredByDriverTable.getTableBodyProps()}>
                  {ordersDeliveredByDriverTable.rows.map(row => {
                    ordersDeliveredByDriverTable.prepareRow(row);
                    return (
                      <tr {...row.getRowProps()}>
                        {row.cells.map(cell => (
                          <td {...cell.getCellProps()} className="border p-2">
                            {cell.render('Cell')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'pendingOrders' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Pending Orders</h2>
              <table {...pendingOrdersTable.getTableProps()} className="w-full border-collapse">
                <thead>
                  {pendingOrdersTable.headerGroups.map(headerGroup => (
                    <tr {...headerGroup.getHeaderGroupProps()} className="bg-gray-100">
                      {headerGroup.headers.map(column => (
                        <th {...column.getHeaderProps()} className="border p-2 text-left">
                          {column.render('Header')}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody {...pendingOrdersTable.getTableBodyProps()}>
                  {pendingOrdersTable.rows.map(row => {
                    pendingOrdersTable.prepareRow(row);
                    return (
                      <tr {...row.getRowProps()}>
                        {row.cells.map(cell => (
                          <td {...cell.getCellProps()} className="border p-2">
                            {cell.render('Cell')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OfficeManagerReports;