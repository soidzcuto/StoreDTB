import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BalanceProvider } from "./context/BalanceContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import TopUp from "./pages/TopUp";
import Orders from "./pages/Orders";
import TransactionHistory from "./pages/TransactionHistory";
import Downloads from "./pages/Downloads";
import Contact from "./pages/Contact";
import News from "./pages/News";
import ApiSeller from "./pages/ApiSeller";
import { Login, Register } from "./pages/Login";
import Profile from "./pages/Profile";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B95A8' }}>
        Đang tải...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BalanceProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/"                  element={<Home />} />
              <Route path="/nap-tien"          element={<TopUp />} />
              <Route path="/don-hang"          element={<Orders />} />
              <Route path="/lich-su-giao-dich" element={<TransactionHistory />} />
              <Route path="/tin-tuc"           element={<News />} />
              <Route path="/tai-xuong"         element={<Downloads />} />
              <Route path="/api-seller"        element={<ApiSeller />} />
              <Route path="/lien-he"           element={<Contact />} />
              <Route path="/ho-so"             element={<Profile />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </BalanceProvider>
    </AuthProvider>
  );
}
