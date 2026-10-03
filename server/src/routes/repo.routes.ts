import { Router } from "express";
import {
    connectRepo,
    disconnectRepo,
    getRepositories,
    inspectRepo,
    deployRepoBaseline,
    getBaselineStatus,
} from "../controllers/repo.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getRepositories);
router.post("/connect", requireAuth, connectRepo);
router.post("/inspect", inspectRepo);
router.delete("/:repositoryId/disconnect", requireAuth, disconnectRepo);
router.post("/:repositoryId/deploy-baseline", requireAuth, deployRepoBaseline);
router.get("/:repositoryId/baseline-status", requireAuth, getBaselineStatus);

export default router;
