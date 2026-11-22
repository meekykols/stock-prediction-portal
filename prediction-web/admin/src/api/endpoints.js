import axios from 'axios';
import { api, publicBaseURL, unwrap } from './client';

const clean = (params) => Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  logout: () => api.post('/auth/logout'),
  changePassword: (body) => unwrap(api.patch('/account/password', body)),
  updateProfile: (body) => unwrap(api.patch('/account/profile', body)),
};

export const publicApi = {
  siteConfig: () => axios.get(`${publicBaseURL}/site-config`).then((r) => r.data.data),
};

export const dashboardApi = {
  stats: () => unwrap(api.get('/dashboard')),
  health: () => unwrap(api.get('/health')),
};

export const usersApi = {
  list: (params) => unwrap(api.get('/users', { params: clean(params) })),
  get: (id) => unwrap(api.get(`/users/${id}`)),
  update: (id, body) => unwrap(api.patch(`/users/${id}`, body)),
  grant: (id, body) => api.post(`/users/${id}/grant`, body).then((r) => r.data),
  createStaff: (body) => unwrap(api.post('/staff', body)),
};

export const billingApi = {
  subscriptions: (params) => unwrap(api.get('/subscriptions', { params: clean(params) })),
  cancel: (id, immediate) => api.post(`/subscriptions/${id}/cancel`, { immediate }).then((r) => r.data),
  payments: (params) => unwrap(api.get('/payments', { params: clean(params) })),
};

export const plansApi = {
  list: () => unwrap(api.get('/plans')),
  create: (body) => unwrap(api.post('/plans', body)),
  update: (id, body) => unwrap(api.patch(`/plans/${id}`, body)),
  archive: (id) => unwrap(api.delete(`/plans/${id}`)),
};

export const predictionsApi = {
  list: (params) => unwrap(api.get('/predictions', { params: clean(params) })),
  get: (id) => unwrap(api.get(`/predictions/${id}`)),
};

export const messagesApi = {
  list: (params) => unwrap(api.get('/messages', { params: clean(params) })),
  setStatus: (id, status) => unwrap(api.patch(`/messages/${id}`, { status })),
};

export const settingsApi = {
  get: () => unwrap(api.get('/site-config')),
  update: (body) => api.put('/site-config', body).then((r) => r.data),
  uploadImage: (field, file) => {
    const form = new FormData();
    form.append('image', file);
    return unwrap(api.post(`/site-config/images/${field}`, form));
  },
};

export const chatApi = {
  list: (params) => unwrap(api.get('/chat/conversations', { params: clean(params) })),
  get: (id) => unwrap(api.get(`/chat/conversations/${id}`)),
  send: (id, body) => unwrap(api.post(`/chat/conversations/${id}/messages`, { body })),
  read: (id) => api.post(`/chat/conversations/${id}/read`),
  assign: (id) => unwrap(api.post(`/chat/conversations/${id}/assign`)),
  close: (id) => unwrap(api.post(`/chat/conversations/${id}/close`)),
};

export const signalsApi = {
  list: (params) => unwrap(api.get('/signals', { params: clean(params) })),
  config: () => unwrap(api.get('/signals/config')),
  saveConfig: (body) => api.put('/signals/config', body).then((r) => r.data),
  runs: () => unwrap(api.get('/signals/runs')),
  run: (job) => api.post('/signals/run', { job }).then((r) => r.data),
};
