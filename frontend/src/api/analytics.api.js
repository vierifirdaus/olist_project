import api from "./axios";
export const getDeliveredDaily   = (params) => api.get("/analytics/delivered/daily",   { params }).then(r => r.data.data);
export const getDeliveredMonthly = (params) => api.get("/analytics/delivered/monthly", { params }).then(r => r.data.data);
export const getStatusDaily      = (params) => api.get("/analytics/status/daily",      { params }).then(r => r.data.data);
export const getTopCities        = (params) => api.get("/analytics/top-cities",        { params }).then(r => r.data.data);
export const getTopCategories    = (params) => api.get("/analytics/top-categories",    { params }).then(r => r.data.data);
