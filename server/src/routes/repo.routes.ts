import { Router } from "express";
import {
    connectRepo,
    disconnectRepo,
    getRepositories,
} from "../controllers/repo.controller.js";

const router = Router();

router.get("/", getRepositories);
router.post("/connect", connectRepo);
router.delete("/:repositoryId/disconnect", disconnectRepo);

export default router;
