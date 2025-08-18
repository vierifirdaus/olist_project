import { Router } from "express";
import { auth } from "../middleware/auth";
import { listCategories, listStates } from "../controllers/meta.controller";

const r = Router();
// r.use(auth);

r.get("/categories", listCategories);
r.get("/states", listStates);

export default r;
