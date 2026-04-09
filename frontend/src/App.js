import "@/index.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import WelcomePage from "@/pages/WelcomePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import PracticesListPage from "@/pages/PracticesListPage";
import PracticeDetailPage from "@/pages/PracticeDetailPage";
import CreatePracticePage from "@/pages/CreatePracticePage";
import AgentsPage from "@/pages/AgentsPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import CreatorControlRoom from "@/pages/CreatorControlRoom";
import ProfileSettingsPage from "@/pages/ProfileSettingsPage";
import CatalogPage from "@/pages/CatalogPage";
import DeadlineDashboardPage from "@/pages/DeadlineDashboardPage";
import SubmissionCenterPage from "@/pages/SubmissionCenterPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/practices" element={<PracticesListPage />} />
            <Route path="/practices/new" element={<CreatePracticePage />} />
            <Route path="/practices/:id" element={<PracticeDetailPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/deadlines" element={<DeadlineDashboardPage />} />
            <Route path="/submissions" element={<SubmissionCenterPage />} />
            <Route path="/activity-log" element={<ActivityLogPage />} />
            <Route path="/creator" element={<CreatorControlRoom />} />
            <Route path="/profile" element={<ProfileSettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
