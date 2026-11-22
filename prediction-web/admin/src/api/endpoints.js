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

export const tipsApi = {
  list: (params) => unwrap(api.get('/tips', { params: clean(params) })),
  stats: () => unwrap(api.get('/tips/stats')),
  config: () => unwrap(api.get('/tips/config')),
  saveConfig: (body) => api.put('/tips/config', body).then((r) => r.data),
  leagues: (sport) => unwrap(api.get('/tips/leagues', { params: { sport } })),
  runs: () => unwrap(api.get('/tips/runs')),
  run: (job) => api.post('/tips/run', { job }).then((r) => r.data),
  setResult: (id, body) => api.post(`/tips/${id}/result`, body).then((r) => r.data),
};

export const codesApi = {
  list: (params) => unwrap(api.get('/codes', { params: clean(params) })),
  stats: () => unwrap(api.get('/codes/stats')),
  config: () => unwrap(api.get('/codes/config')),
  saveConfig: (body) => api.put('/codes/config', body).then((r) => r.data),
  tipOptions: (params) => unwrap(api.get('/codes/tip-options', { params: clean(params) })),
  create: (body) => api.post('/codes', body).then((r) => r.data),
  update: (id, body) => api.patch(`/codes/${id}`, body).then((r) => r.data),
  withdraw: (id) => api.delete(`/codes/${id}`).then((r) => r.data),
  setResult: (id, body) => api.post(`/codes/${id}/result`, body).then((r) => r.data),
  setSelectionResult: (id, index, state) => api.post(`/codes/${id}/selections/${index}/result`, { state }).then((r) => r.data),
};

export const contestApi = {
  config: () => unwrap(api.get('/contest/config')),
  saveConfig: (body) => api.put('/contest/config', body).then((r) => r.data),
  leaderboard: (month) => unwrap(api.get('/contest/leaderboard', { params: { month } })),
  award: (month, body) => api.post(`/contest/months/${month}/rewards`, body).then((r) => r.data),
  markPaid: (id) => api.post(`/contest/rewards/${id}/paid`).then((r) => r.data),
  exportCsv: (params) => api.get('/contest/export', { params, responseType: 'blob' }).then((r) => r.data),
  promos: () => unwrap(api.get('/promos')),
  createPromo: () => api.post('/promos', {}).then((r) => r.data),
  savePromo: (id, body) => api.patch(`/promos/${id}`, body).then((r) => r.data),
  uploadPromoImage: (id, file) => {
    const form = new FormData();
    form.append('image', file);
    return api.post(`/promos/${id}/image`, form).then((r) => r.data);
  },
};
