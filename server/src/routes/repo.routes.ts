import { Router } from "express";
import {
    connectRepo,
    disconnectRepo,
    getRepositories,
    inspectRepo,
} from "../controllers/repo.controller.js";

const router = Router();

router.get("/", getRepositories);
router.post("/connect", connectRepo);
router.post("/inspect", inspectRepo);
router.delete("/:repositoryId/disconnect", disconnectRepo);

export default router;
