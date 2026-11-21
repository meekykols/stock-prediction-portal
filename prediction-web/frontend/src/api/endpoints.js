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
