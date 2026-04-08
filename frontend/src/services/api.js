import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API}/api`,
  withCredentials: true,
});

// Auth
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, new_password) => api.post('/auth/reset-password', { token, new_password });
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (current_password, new_password) => api.put('/auth/change-password', { current_password, new_password });

// Practices
export const getPractices = () => api.get('/practices');
export const getPractice = (id) => api.get(`/practices/${id}`);
export const createPractice = (data) => api.post('/practices', data);
export const updatePractice = (id, data) => api.put(`/practices/${id}`, data);
export const deletePractice = (id) => api.delete(`/practices/${id}`);
export const downloadPracticePdf = (id) => api.get(`/practices/${id}/pdf`, { responseType: 'blob' });

// Documents
export const uploadDocument = (practiceId, file, category = 'other') => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/documents/upload/${practiceId}?category=${category}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const getPracticeDocuments = (practiceId) => api.get(`/documents/practice/${practiceId}`);
export const getDocument = (documentId) => api.get(`/documents/${documentId}`, { responseType: 'blob' });

// AI Agents
export const executeAgent = (agentType, practiceId, inputData) =>
  api.post('/agents/execute', { agent_type: agentType, practice_id: practiceId, input_data: inputData });
export const getAgentsInfo = () => api.get('/agents/info');
export const orchestrateAgents = (practiceId, query) =>
  api.post('/agents/orchestrate', { practice_id: practiceId, query });

// Activity Logs
export const getActivityLogs = (limit = 50, category = null) => {
  const params = { limit };
  if (category) params.category = category;
  return api.get('/activity-logs', { params });
};
export const getPracticeActivityLogs = (practiceId) => api.get(`/activity-logs/practice/${practiceId}`);

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Reference Data
export const getCountries = () => api.get('/countries');
export const getDocumentCategories = () => api.get('/document-categories');

export default api;
