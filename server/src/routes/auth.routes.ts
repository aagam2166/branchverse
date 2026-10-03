import { Router } from "express";
import {
    getGitHubAuthUrl,
    handleGitHubCallback,
    getMe,
    getUserRepos,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/github", getGitHubAuthUrl);
router.get("/github/callback", handleGitHubCallback);
router.get("/me", authenticateUser, getMe);
router.get("/user-repos", authenticateUser, getUserRepos);

export default router;
