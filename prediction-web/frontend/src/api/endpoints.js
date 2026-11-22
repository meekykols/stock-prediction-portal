import { api, unwrap } from './client';

export const publicApi = {
  siteConfig: () => unwrap(api.get('/site-config')),
  plans: () => unwrap(api.get('/plans')),
  contact: (body) => api.post('/contact', body).then((r) => r.data),
};

export const authApi = {
  login: (body) => unwrap(api.post('/auth/login', body)),
  register: (body) => unwrap(api.post('/auth/register', body)),
  logout: () => api.post('/auth/logout'),
  me: () => unwrap(api.get('/auth/me')),
};

export const accountApi = {
  updateProfile: (body) => unwrap(api.patch('/account/profile', body)),
  changePassword: (body) => unwrap(api.patch('/account/password', body)),
  subscriptions: () => unwrap(api.get('/account/subscriptions')),
};

export const predictionsApi = {
  usage: () => unwrap(api.get('/predictions/usage')),
  list: (params) => unwrap(api.get('/predictions', { params })),
  get: (id) => unwrap(api.get(`/predictions/${id}`)),
  createStock: (body) => unwrap(api.post('/predictions/stocks', body)),
  createSports: (body) => unwrap(api.post('/predictions/sports', body)),
  fixtures: (date) => unwrap(api.get('/sports/fixtures', { params: date ? { date } : {} })),
};

export const billingApi = {
  summary: () => unwrap(api.get('/billing/summary')),
  payments: () => unwrap(api.get('/billing/payments')),
  checkout: (plan) => unwrap(api.post('/billing/checkout', { plan })),
  verify: (reference) => unwrap(api.get(`/billing/verify/${encodeURIComponent(reference)}`)),
  cancel: () => api.post('/billing/cancel').then((r) => r.data),
  resume: () => api.post('/billing/resume').then((r) => r.data),
  manageCard: () => unwrap(api.get('/billing/manage-card')),
};

export const chatApi = {
  thread: () => unwrap(api.get('/chat')),
  send: (body) => unwrap(api.post('/chat/messages', { body })),
  read: () => api.post('/chat/read'),
};

export const signalsApi = {
  list: (params) => unwrap(api.get('/signals', { params })),
  get: (id) => unwrap(api.get(`/signals/${id}`)),
};
