import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginApi } from "../services/api";

const roleConfig = {
  cashier: {
    defaultRoute: '/cashier/',
    routes: [
      { path: '/cashier', label: 'Dashboard' },
      { path: '/cashier/create-order', label: 'New Order' },
      { path: '/cashier/cost-update', label: 'Cost Updates' }
    ]
  },
  driver: {
    defaultRoute: '/driver/',
    routes: [
      { path: '/driver', label: 'My Deliveries' },
      { path: '/driver/history', label: 'Delivery History' }
    ]
  },
  transit_driver: {
    defaultRoute: '/transit_driver/',
    routes: []
  },
  office_manager: {
    defaultRoute: '/office/',
    routes: [
      { path: '/office', label: 'Reports' },
      { path: '/office/staff', label: 'Staff Management' }
    ]
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRoutes, setUserRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const setupUserRoutes = useCallback((role) => {
    const config = roleConfig[role];
    if (config) {
      setUserRoutes(config.routes);
      return config.defaultRoute;
    }
    return '/';
  }, []);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    const currentPath = location.pathname;

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setupUserRoutes(parsedUser.role);
      
      if (currentPath === '/login' || currentPath === '/') {
        const config = roleConfig[parsedUser.role];
        if (config) {
          navigate(config.defaultRoute, { replace: true });
        }
      }
    }
    setLoading(false);
  }, [navigate, location.pathname, setupUserRoutes]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await loginApi({ email, password });
      
      if (!response.data) {
        throw new Error('Invalid response from server');
      }
      
      const { user_id, email: userEmail, county, role, access_token, route_id } = response.data;
      
      if (!user_id || !role || !access_token) {
        throw new Error('Invalid response data from server');
      }
      
      const userData = {
        id: user_id,
        email: userEmail,
        role,
        county,
        token: access_token,
        route_id
      };
      
      sessionStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setupUserRoutes(role);
      
      const config = roleConfig[role];
      const defaultRoute = config ? config.defaultRoute : '/';
      
      return { ...userData, defaultRoute };
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  }, [setupUserRoutes]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("user");
    setUser(null);
    setUserRoutes([]);
    navigate("/login");
  }, [navigate]);

  const memoizedValue = useMemo(() => ({
    user,
    login,
    logout,
    loading,
    userRoutes
  }), [user, login, logout, loading, userRoutes]);

  return (
    <AuthContext.Provider value={memoizedValue}>
      {loading ? null : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);