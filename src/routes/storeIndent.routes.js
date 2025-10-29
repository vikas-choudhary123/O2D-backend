import { Router } from "express";
import {
  createStoreIndent,
  approveStoreIndent,
  getPendingIndents,
  getHistory,
} from "../controllers/storeIndent.controller.js";

const router = Router();

router.post("/", createStoreIndent);
router.put("/approve", approveStoreIndent);
router.get("/pending", getPendingIndents);
router.get("/history", getHistory);

export default router;
