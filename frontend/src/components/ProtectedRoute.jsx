import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  const loc = useLocation();
  if (booting) return null; // bisa diganti spinner
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}
