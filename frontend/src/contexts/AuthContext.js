import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = process.env.REACT_APP_BACKEND_URL;

function formatApiErrorDetail(detail) {
  if (detail == null) return "Si e verificato un errore. Riprova.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email, password }, { withCredentials: true });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiErrorDetail(error.response?.data?.detail) || error.message };
    }
  };

  const register = async (data) => {
    try {
      const response = await axios.post(`${API}/api/auth/register`, data, { withCredentials: true });
      setUser(response.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiErrorDetail(error.response?.data?.detail) || error.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
    } catch {
      // Ignore
    }
    setUser(false);
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get(`${API}/api/auth/me`, { withCredentials: true });
      setUser(response.data);
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
