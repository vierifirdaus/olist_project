import api from "./axios";

export const apiRegister = (payload) => api.post("/auth/register", payload).then(r => r.data);
export const apiLogin    = (payload) => api.post("/auth/login", payload).then(r => r.data);
export const apiLogout   = ()        => api.post("/auth/logout").then(r => r.data);
export const apiMe       = ()        => api.get("/auth/me").then(r => r.data);
