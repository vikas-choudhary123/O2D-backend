import { Router } from "express";
import { fetchPendingFirstWeight, fetchFirstWeightHistory } from "../controllers/firstWeight.controller.js";

const router = Router();

router.get("/pending", fetchPendingFirstWeight);
router.get("/history", fetchFirstWeightHistory); // 👈 Add this

export default router;
