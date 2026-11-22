import axios from 'axios';

const baseURL = `${import.meta.env.VITE_API_URL || '/api'}/admin`;
export const publicBaseURL = `${import.meta.env.VITE_API_URL || '/api'}/v1`;

export const api = axios.create({ baseURL, withCredentials: true, timeout: 30000 });

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

let handlers = { onRefreshed: () => {}, onExpired: () => {} };
export const setSessionHandlers = (h) => { handlers = { ...handlers, ...h }; };

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise = null;
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, null, { withCredentials: true })
      .then((res) => { setAccessToken(res.data.data.accessToken); return res.data.data; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall && accessToken) {
      original._retry = true;
      try {
        const data = await refreshSession();
        handlers.onRefreshed(data);
        return api(original);
      } catch {
        setAccessToken(null);
        handlers.onExpired();
      }
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (err) =>
  err?.response?.data?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server' : err?.message) || 'Something went wrong';
export const fieldErrors = (err) => err?.response?.data?.errors || {};
export const unwrap = (p) => p.then((r) => r.data.data);
