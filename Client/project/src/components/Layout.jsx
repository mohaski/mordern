
import React, { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Package, Truck, Home, LogOut, Menu, X, FileText, ClipboardList, History, Users } from "lucide-react";
import UserAccountMenu from "./UserAccountMenu";
import { useAuth } from "../contexts/authContext"; // Correct import path

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
    ],
    transit_driver: [
      { path: "/transit_driver", label: "Dashboard", icon: <Truck className="h-5 w-5 mr-1" /> }
    ],
    office_manager: [
      { path: '/office', label: 'Reports', icon: <ClipboardList className="h-5 w-5 mr-1" /> },
      { path: '/office/staff', label: 'Staff Management', icon: <Users className="h-5 w-5 mr-1" /> }
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
            <div className="hidden sm:flex items-center">
              <div className="mr-8">
              {getNavLinks()}
              </div>
              {user && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-600 hover:text-red-900 focus:outline-none"
                  >
                    <LogOut className="h-5 w-5 mr-1" />
                    Logout
                  </button>
                  <UserAccountMenu />
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="sm:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-white shadow-md p-4 space-y-4">
            {getNavLinks()}
            {user && (
              <div className="border-t pt-4 mt-4">
                <UserAccountMenu />
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-red-600 hover:text-red-900 flex items-center mt-4"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Logout
                </button>
              </div>
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