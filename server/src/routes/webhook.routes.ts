import { Router } from "express";
import { handleWebhook } from "../controllers/webhook.controller.js";

const router = Router();

router.post("/github", handleWebhook);

export default router;