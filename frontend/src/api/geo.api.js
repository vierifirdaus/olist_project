import api from "./axios";
export const geoChoropleth     = (params) => api.get("/geo/states/choropleth", { params }).then(r => r.data.data);
export const geoCustomerPoints = (params) => api.get("/geo/customers/points",  { params }).then(r => r.data.data);
export const geoFlows          = (params) => api.get("/geo/flows",             { params }).then(r => r.data.data);
export const metaCategories    = ()      => api.get("/meta/categories").then(r => r.data.data);
export const metaStates        = ()      => api.get("/meta/states").then(r => r.data.data);
