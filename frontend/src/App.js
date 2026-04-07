import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import PracticesListPage from "@/pages/PracticesListPage";
import CreatePracticePage from "@/pages/CreatePracticePage";
import PracticeDetailPage from "@/pages/PracticeDetailPage";
import AgentsPage from "@/pages/AgentsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="practices" element={<PracticesListPage />} />
            <Route path="practices/new" element={<CreatePracticePage />} />
            <Route path="practices/:id" element={<PracticeDetailPage />} />
            <Route path="agents" element={<AgentsPage />} />
            <Route path="activity-log" element={<ActivityLogPage />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  );
}

export default App;
