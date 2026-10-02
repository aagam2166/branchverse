import type { Request, Response } from "express";
import {
    connectRepository,
    disconnectRepository,
    listRepositories,
} from "../services/repo.service.js";

export const connectRepo = async (req: Request, res: Response) => {
    try {
        const { repositoryFullName, appDirectory } = req.body;

        if (!repositoryFullName || typeof repositoryFullName !== "string") {
            res.status(400).json({ error: "repositoryFullName is required" });
            return;
        }

        const result = await connectRepository(repositoryFullName, appDirectory);

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

export const disconnectRepo = async (req: Request, res: Response) => {
    try {
        const repositoryId = String(req.params["repositoryId"]);
        await disconnectRepository(repositoryId);
        res.json({ message: "Repository disconnected and webhook removed" });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Failed to disconnect repository:", error);
        res.status(500).json({ error: message });
    }
};

export const getRepositories = async (_req: Request, res: Response) => {
    try {
        const repos = await listRepositories();
        res.json({ repositories: repos });
    } catch (error) {
        console.error("Failed to list repositories:", error);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};
