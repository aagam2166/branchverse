import { Router } from "express";
import {
    listRepositories,
    connectRepository,
    deleteRepository,
} from "../controllers/repository.controller.js";

const router = Router();

router.get("/", listRepositories);
router.post("/", connectRepository);
router.delete("/:id", deleteRepository);

export default router;
