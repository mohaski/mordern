import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  // Wait for auth to be checked
  if (loading) {
    return null;
  }

  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If user's role is not in the allowed roles
  if (!allowedRoles.includes(user.role)) {
    // Redirect to their role-specific dashboard
    const roleRoutes = {
      cashier: '/cashier',
      driver: '/driver',
      transit_driver: '/transit_driver',
      office_manager: '/office'
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
