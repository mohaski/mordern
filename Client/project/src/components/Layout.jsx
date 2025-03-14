import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Package, Truck, Home, LogOut, Menu, X, FileText, ClipboardList, History } from "lucide-react";
import { useAuth } from "../contexts/authContext";

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("user"); // Ensure user data is cleared
    navigate("/login");
  };

  const defaultLinks = [
      { path: "/", label: "Home", icon: <Home className="h-5 w-5 mr-1" /> },
      {
        path: "/create-order",
        label: "Create Order",
        icon: <Package className="h-5 w-5 mr-1" />,
      },
      {
        path: "/track-order",
        label: "Track Order",
        icon: <Truck className="h-5 w-5 mr-1" />,
      },
  ];

  const roleSpecificLinks = {
    cashier: [
      { path: "/cashier", label: "Dashboard", icon: <Home className="h-5 w-5 mr-1" /> },
      { path: "/cashier/create-order", label: "New Order", icon: <Package className="h-5 w-5 mr-1" /> },
      { path: "/cashier/cost-update", label: "Cost Updates", icon: <FileText className="h-5 w-5 mr-1" /> }
    ],
    driver: [
      { path: "/driver", label: "My Deliveries", icon: <Truck className="h-5 w-5 mr-1" /> },
      { path: "/driver/history", label: "Delivery History", icon: <History className="h-5 w-5 mr-1" /> }
    ],
    office_manager: [
      { path: "/office", label: "Dashboard", icon: <Home className="h-5 w-5 mr-1" /> },
      { path: "/office/reports", label: "Reports", icon: <ClipboardList className="h-5 w-5 mr-1" /> }
    ]
  };

  const getNavLinks = () => {
    const links = user ? (roleSpecificLinks[user.role] || defaultLinks) : defaultLinks;
    return links.map(({ path, label, icon }) => (
      <Link
        key={path}
        to={path}
        className={`border-b-2 ${
          (location.pathname === path || location.pathname.startsWith(path + '/'))
            ? "border-red-500 text-gray-900"
            : "border-transparent text-gray-500"
        } hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium`}
      >
        {icon} {label}
      </Link>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and App Name */}
            <div className="flex items-center">
              <Package className="h-8 w-8 text-red-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Modern Cargo
                {user && (
                  <span className="ml-1 text-sm font-normal text-gray-500">
                    - {user.role.replace("_", " ").toUpperCase()}
                  </span>
                )}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex sm:space-x-8 items-center">
              {getNavLinks()}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="sm:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Logout Button */}
            {user && (
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-600 hover:text-red-900 focus:outline-none"
              >
                <LogOut className="h-5 w-5 mr-1" />
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white shadow-md p-4 space-y-4">
            {getNavLinks()}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full text-left text-red-600 hover:text-red-900 flex items-center"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            )}
          </div>
        )}
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default Layout;
