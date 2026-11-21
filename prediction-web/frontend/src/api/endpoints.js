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
