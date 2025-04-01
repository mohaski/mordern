import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/authContext';
import ProtectedRoute from './components/protectedRoute';
import Login from './pages/login';
import CustomerHome from './pages/customer/CustomerHome';
import OrderCreation from './pages/customer/OrderCreation';
import OrderTracking from './pages/customer/OrderTracking';
import ManagerOrderCreation from './pages/manager/managerOrderCreation';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import OrderCostUpdate from './pages/manager/OrderCostUpdate';
import Layout from './components/Layout';
import OrderDetails from './pages/manager/OrderDetails';
import CountyDriverDashboard from './pages/drivers/countyDrivers/CountyDriverDashboard';
import TransitDriverDashboard from './pages/drivers/transitDrivers/TransitDriverDashboard';
import StaffManagement from './pages/office/StaffManagement';
import Reports from './pages/office/Reports';
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Public Customer Routes */}
          <Route path="/" element={
            <Layout />
          }>
            <Route index element={<CustomerHome />} />
            <Route path="create-order/*" element={<OrderCreation />} />
            <Route path="track-order" element={<OrderTracking />} />
          </Route>

          {/* Protected Cashier Routes */}
          <Route path="/cashier" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <Layout><ManagerDashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/cashier/*" element={
            <ProtectedRoute allowedRoles={['cashier']}>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="create-order" element={<ManagerOrderCreation />} />
            <Route path="cost-update" element={<OrderCostUpdate />} />
            <Route path="orders/:order_id" element={<OrderDetails />} />
          </Route>

          {/* Protected Driver Routes */}
          <Route path="/driver" element={
          <ProtectedRoute allowedRoles={['driver']}>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<CountyDriverDashboard />} />
        </Route>

        {/* Protected Transit Driver Routes */}
        <Route path="/transit_driver" element={
          <ProtectedRoute allowedRoles={['transit_driver']}>
            <Layout><TransitDriverDashboard /></Layout>
          </ProtectedRoute>
        } />

          {/* Protected Office Manager Routes */}
          <Route path="/office/*" element={
            <ProtectedRoute allowedRoles={['office_manager']}>
              <Layout>
                <Routes>
                  <Route index element={<Reports />} />
                  <Route path="staff" element={<StaffManagement />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;