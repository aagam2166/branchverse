import type { Request, Response } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { prisma } from "../lib/prisma.js";
import { Octokit } from "@octokit/rest";
import {
    connectRepository,
    disconnectRepository,
    listRepositories,
    inspectRepository,
} from "../services/repo.service.js";

export const connectRepo = async (req: AuthRequest, res: Response) => {
    try {
        const { repositoryFullName, appDirectory, buildCommand, installCommand, productionUrl } = req.body;

        if (!repositoryFullName || typeof repositoryFullName !== "string") {
            res.status(400).json({ error: "repositoryFullName is required" });
            return;
        }

        const result = await connectRepository(
            repositoryFullName, 
            appDirectory, 
            buildCommand, 
            installCommand,
            productionUrl,
            req.user?.id,
            req.user?.accessToken
        );

        res.status(201).json({
            message: `Repository ${repositoryFullName} connected successfully`,
            repository: result.repository,
            webhookId: result.webhookId,
            webhookUrl: result.webhookUrl,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to connect repository:", error);
        res.status(500).json({ error: message });
    }
};

export const disconnectRepo = async (req: AuthRequest, res: Response) => {
    try {
        const repositoryId = String(req.params["repositoryId"]);
        const userId = req.user?.id;

        // If user is authenticated, ensure they own the repo
        if (userId) {
            const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
            if (repo && repo.userId && repo.userId !== userId) {
                res.status(403).json({ error: "You do not have permission to disconnect this repository." });
                return;
            }
        }

        await disconnectRepository(repositoryId);
        res.json({ message: "Repository disconnected and webhook removed" });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to disconnect repository:", error);
        res.status(500).json({ error: message });
    }
};

export const getRepositories = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.json({ repositories: [] });
            return;
        }

        const repos = await listRepositories(userId);
        res.json({ repositories: repos });
    } catch (error) {
        console.error("Failed to list repositories:", error);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};

export const inspectRepo = async (req: Request, res: Response) => {
    try {
        const { repositoryFullName, appDirectory } = req.body;

        if (!repositoryFullName || typeof repositoryFullName !== "string") {
            res.status(400).json({ error: "repositoryFullName is required" });
            return;
        }

        const result = await inspectRepository(repositoryFullName, appDirectory);
        res.json(result);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to inspect repository:", error);
        res.status(500).json({ error: message });
    }
};

import { deployBaseline } from "../services/baseline.service.js";

export const deployRepoBaseline = async (req: AuthRequest, res: Response) => {
    try {
        const repositoryId = String(req.params["repositoryId"]);
        const userId = req.user?.id;

        const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
        if (!repo) {
            res.status(404).json({ error: "Repository not found" });
            return;
        }

        if (repo.userId && repo.userId !== userId) {
            res.status(403).json({ error: "Unauthorized" });
            return;
        }

        const octokit = new Octokit({ auth: req.user?.accessToken || process.env.GITHUB_TOKEN?.trim() });
        const [owner, repoName] = repo.fullName.split("/");
        
        if (!owner || !repoName) {
            res.status(400).json({ error: "Invalid repository full name" });
            return;
        }
        
        let commitSha = "HEAD";
        try {
            const { data: commitData } = await octokit.repos.getCommit({
                owner,
                repo: repoName,
                ref: repo.defaultBranch,
            });
            commitSha = commitData.sha;
        } catch (e) {
            console.warn("Could not fetch commit sha, using defaultBranch as ref", e);
            commitSha = repo.defaultBranch;
        }

        // Return immediately and do deployment in background
        res.status(202).json({ message: "Baseline deployment started" });

        deployBaseline(repo.id, repo.fullName, commitSha, repo.defaultBranch).catch(err => {
            console.error("Baseline deployment failed:", err);
        });
        
    } catch (error) {
        console.error("Failed to deploy baseline:", error);
        res.status(500).json({ error: "Failed to start baseline deployment" });
    }
};

export const getBaselineStatus = async (req: AuthRequest, res: Response) => {
    try {
        const repositoryId = String(req.params["repositoryId"]);
        const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
        
        if (!repo) {
            res.status(404).json({ error: "Repository not found" });
            return;
        }
        
        res.json({
            status: repo.baselineStatus,
            url: repo.baselineUrl,
            containerId: repo.baselineContainerId,
            port: repo.baselinePort
        });
    } catch (error) {
        console.error("Failed to fetch baseline status:", error);
        res.status(500).json({ error: "Failed to fetch baseline status" });
    }
};
