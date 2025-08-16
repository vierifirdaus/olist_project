import { Router } from "express";
import { auth } from "../middleware/auth";
import {
  choroplethStates,
  customerPoints,
  flowsSellerToCustomer,
} from "../controllers/geo.controller";

const r = Router();

r.use(auth); // Semua endpoint geo butuh auth

// /api/geo/states/choropleth?start=&end=&category=&metric=orders|delivery_days|freight
r.get("/states/choropleth", choroplethStates);

// /api/geo/customers/points?start=&end=&category=&limit=2000
r.get("/customers/points", customerPoints);

// /api/geo/flows?start=&end=&category=&minCount=50
r.get("/flows", flowsSellerToCustomer);

export default r;
