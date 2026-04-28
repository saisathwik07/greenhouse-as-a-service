import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { useAuth } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import DataPage from "./pages/DataPage";
import AgriculturalPage from "./pages/AgriculturalPage";
import IoTPage from "./pages/IoTPage";
import AIPage from "./pages/AIPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import HomePage from "./pages/HomePage";
import PestDisease from "./pages/PestDisease";
import GreenhouseSimPage from "./pages/GreenhouseSimPage";
import LiveDataPage from "./pages/LiveDataPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSupportPage from "./pages/AdminSupportPage";
import HelpPage from "./pages/HelpPage";
import MyTicketsPage from "./pages/MyTicketsPage";
import AdminRoute from "./components/AdminRoute";
import NonGuestRoute from "./components/NonGuestRoute";
import ChatWidget from "./components/ChatWidget";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function App() {
  const { user, loading } = useAuth();
  /** Synced with `Navbar` Login / Sign up toggles when showing the auth screen. */
  const [authFormMode, setAuthFormMode] = useState("login");

  if (loading) {
    return (
      <div className="min-h-screen bg-gaas-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse-slow">🌿</div>
          <p className="text-gaas-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-gaas-bg">
        <Navbar authFormMode={authFormMode} onAuthFormModeChange={setAuthFormMode} />
        <LoginPage mode={authFormMode} onModeChange={setAuthFormMode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gaas-bg">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-5rem)] overflow-auto">
          <div className="max-w-6xl mx-auto p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/home"
                element={
                  <NonGuestRoute>
                    <HomePage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/data"
                element={
                  <NonGuestRoute>
                    <DataPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/agricultural"
                element={
                  <NonGuestRoute>
                    <AgriculturalPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/agriculture"
                element={
                  <NonGuestRoute>
                    <AgriculturalPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/iot"
                element={
                  <NonGuestRoute>
                    <IoTPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/greenhouse"
                element={
                  <NonGuestRoute>
                    <GreenhouseSimPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/live"
                element={
                  <NonGuestRoute>
                    <LiveDataPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/mqtt"
                element={
                  <NonGuestRoute>
                    <IoTPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/ai"
                element={
                  <NonGuestRoute>
                    <AIPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/pest-disease"
                element={
                  <NonGuestRoute>
                    <PestDisease />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/subscription"
                element={
                  <NonGuestRoute>
                    <SubscriptionPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/pro"
                element={
                  <NonGuestRoute>
                    <SubscriptionPage />
                  </NonGuestRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/support"
                element={
                  <AdminRoute>
                    <AdminSupportPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <AdminRoute>
                    <AdminSupportPage />
                  </AdminRoute>
                }
              />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/my-tickets" element={<MyTicketsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}
