import { Router } from "express";
import {
    destroyPreviewHandler,
    redeployPreviewHandler,
    getPreviewStatusHandler,
} from "../controllers/preview.controller.js";

const router = Router();

router.post("/:pullRequestId/redeploy", redeployPreviewHandler);
router.post("/:deploymentId/destroy", destroyPreviewHandler);
router.delete("/:deploymentId", destroyPreviewHandler);
router.get("/:deploymentId/status", getPreviewStatusHandler);

export default router;
