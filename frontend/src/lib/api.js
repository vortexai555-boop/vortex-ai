import axios from "axios";

const BACKEND_URL = "https://vortex-ai-9vtl.onrender.com";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("Grexo_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith("/login")) {
      // Don't auto-redirect from public pages
    }
    return Promise.reject(err);
  }
);

export default api;
export { api };
