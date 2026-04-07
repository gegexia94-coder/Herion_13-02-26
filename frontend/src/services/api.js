import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API}/api`,
  withCredentials: true,
});

// Practices
export const getPractices = () => api.get('/practices');
export const getPractice = (id) => api.get(`/practices/${id}`);
export const createPractice = (data) => api.post('/practices', data);
export const updatePractice = (id, data) => api.put(`/practices/${id}`, data);
export const deletePractice = (id) => api.delete(`/practices/${id}`);

// Documents
export const uploadDocument = (practiceId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/documents/upload/${practiceId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const getPracticeDocuments = (practiceId) => api.get(`/documents/practice/${practiceId}`);
export const getDocument = (documentId) => api.get(`/documents/${documentId}`, { responseType: 'blob' });

// AI Agents
export const executeAgent = (agentType, practiceId, inputData) => 
  api.post('/agents/execute', { agent_type: agentType, practice_id: practiceId, input_data: inputData });
export const getAgentsInfo = () => api.get('/agents/info');

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

export default api;
