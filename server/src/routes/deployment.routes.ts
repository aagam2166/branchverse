import { Router } from "express";
import {
    listPullRequests,
    getDeploymentsForPR,
    getDeploymentLogs,
} from "../controllers/deployment.controller.js";

const router = Router();

router.get("/", listPullRequests);
router.get("/:pullRequestId", getDeploymentsForPR);
router.get("/:pullRequestId/logs/:deploymentId", getDeploymentLogs);

export default router;
