import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  withCredentials: true, // penting untuk cookie httpOnly
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    console.error("[API]", e?.response?.status, e?.response?.data || e.message);
    throw e;
  }
);

export default api;
