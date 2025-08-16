import React from "react";
import { Link } from "react-router-dom";
import { Button } from "antd";
import { useAuth } from "../hooks/useAuth.jsx";

export default function MainLayout({ children }) {
  const { logout } = useAuth();
  return (
    <>
      <nav className="bg-white p-4 shadow-sm border-b border-slate-100 flex justify-between items-center">
        <div className="text-lg font-bold text-blue-600">Olist Dashboard</div>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
          <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">Dashboard</Link>
          <Link to="/geo" className="text-gray-600 hover:text-blue-600">Geo</Link>
          <Button danger onClick={logout}>Logout</Button>
        </div>
      </nav>
      <div className="p-4">{children}</div>
    </>
  );
}
