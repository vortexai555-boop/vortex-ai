import React, { Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";

const Landing = React.lazy(() => import("@/pages/Landing"));
const Login = React.lazy(() => import("@/pages/Login"));
const Signup = React.lazy(() => import("@/pages/Signup"));
const Forgot = React.lazy(() => import("@/pages/Forgot"));
const AuthCallback = React.lazy(() => import("@/pages/AuthCallback"));
const DashboardLayout = React.lazy(() => import("@/pages/DashboardLayout"));
const DashboardHome = React.lazy(() => import("@/pages/DashboardHome"));
const ChatPage = React.lazy(() => import("@/pages/ChatPage"));
const WebsitePage = React.lazy(() => import("@/pages/WebsitePage"));
const ImagePage = React.lazy(() => import("@/pages/ImagePage"));
const ProductivityPage = React.lazy(() => import("@/pages/ProductivityPage"));
const ProfilePage = React.lazy(() => import("@/pages/ProfilePage"));
const SettingsPage = React.lazy(() => import("@/pages/SettingsPage"));
const BillingPage = React.lazy(() => import("@/pages/BillingPage"));
const PaymentPage = React.lazy(() => import("@/pages/PaymentPage"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

// Admin pages
const AdminLayout = React.lazy(() => import("@/pages/admin/AdminLayout"));
const AdminPayments = React.lazy(() => import("@/pages/admin/AdminPayments"));
const AdminPaymentSettings = React.lazy(() => import("@/pages/admin/AdminPaymentSettings"));
const AdminSubscriptions = React.lazy(() => import("@/pages/admin/AdminSubscriptions"));
const AdminAudit = React.lazy(() => import("@/pages/admin/AdminAudit"));
const AdminPlans = React.lazy(() => import("@/pages/admin/AdminPlans"));
const AdminUsers = React.lazy(() => import("@/pages/admin/AdminUsers"));
const AdminProjects = React.lazy(() => import("@/pages/admin/AdminProjects"));
const AdminGenerations = React.lazy(() => import("@/pages/admin/AdminGenerations"));
const AdminApiUsage = React.lazy(() => import("@/pages/admin/AdminApiUsage"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminSystem = React.lazy(() => import("@/pages/admin/AdminSystem"));

// Loading Fallback
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#030305]">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-800 border-t-cyan-500"></div>
      <div className="text-sm font-medium text-slate-400">Loading...</div>
    </div>
  </div>
);

function AppRouter() {
  const location = useLocation();
  // CRITICAL race-condition guard: detect session_id in URL fragment during render
  if (location.hash?.includes("session_id=")) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AuthCallback />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="/dashboard/website" element={<WebsitePage />} />
          <Route path="/dashboard/images" element={<ImagePage />} />
          <Route path="/dashboard/productivity" element={<ProductivityPage />} />
          <Route path="/dashboard/billing" element={<BillingPage />} />
          <Route path="/dashboard/payment" element={<PaymentPage />} />
          <Route path="/dashboard/admin" element={<AdminLayout />}>
            <Route index element={<AdminAnalytics />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="generations" element={<AdminGenerations />} />
            <Route path="api-usage" element={<AdminApiUsage />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="subscriptions" element={<AdminSubscriptions />} />
            <Route path="plans" element={<AdminPlans />} />
            <Route path="settings" element={<AdminPaymentSettings />} />
            <Route path="system" element={<AdminSystem />} />
            <Route path="audit" element={<AdminAudit />} />
          </Route>
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
