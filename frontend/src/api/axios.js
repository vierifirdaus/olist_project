import axios from "axios";

const api = axios.create({
  baseURL: "http://212.85.26.216:5002/api",
  withCredentials: false, // penting untuk cookie httpOnly
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    console.error("[API]", e?.response?.status, e?.response?.data || e.message);
    throw e;
  }
);

export default api;
