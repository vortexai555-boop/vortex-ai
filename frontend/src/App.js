import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Forgot from "@/pages/Forgot";
import AuthCallback from "@/pages/AuthCallback";
import DashboardLayout from "@/pages/DashboardLayout";
import DashboardHome from "@/pages/DashboardHome";
import ChatPage from "@/pages/ChatPage";
import WebsiteBuilder from "@/pages/WebsiteBuilder";
import ImagePage from "@/pages/ImagePage";
import ProductivityPage from "@/pages/ProductivityPage"; // Imported here
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import BillingPage from "@/pages/BillingPage";
import PaymentPage from "@/pages/PaymentPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminPaymentSettings from "@/pages/admin/AdminPaymentSettings";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminPlans from "@/pages/admin/AdminPlans";
import ProtectedRoute from "@/components/ProtectedRoute";

function AppRouter() {
  const location = useLocation();
  // CRITICAL race-condition guard: detect session_id in URL fragment during render
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/dashboard/chat" element={<ChatPage />} />
        <Route path="/dashboard/chat/:cid" element={<ChatPage />} />
        <Route path="/dashboard/website" element={<WebsiteBuilder />} />
        <Route path="/dashboard/images" element={<ImagePage />} />
        <Route path="/dashboard/productivity" element={<ProductivityPage />} /> {/* Route Added Here */}
        <Route path="/dashboard/billing" element={<BillingPage />} />
        <Route path="/dashboard/payment" element={<PaymentPage />} />
        <Route path="/dashboard/admin" element={<AdminLayout />}>
          <Route index element={<AdminPayments />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="settings" element={<AdminPaymentSettings />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
        <Route path="/dashboard/profile" element={<ProfilePage />} />
        <Route path="/dashboard/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster theme="dark" position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
