import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

function sanitizeRepoName(input: string): string {
    let clean = input.trim();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "");
    clean = clean.replace(/\.git$/i, "");
    clean = clean.replace(/^\/+|\/+$/g, "");
    return clean;
}

export const listRepositories = async (req: Request, res: Response) => {
    try {
        const repositories = await prisma.repository.findMany({
            include: {
                _count: {
                    select: { pullRequests: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({ repositories });
    } catch (error) {
        console.error("Failed to list repositories:", error);
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};

export const connectRepository = async (req: Request, res: Response) => {
    try {
        const { fullName, defaultBranch } = req.body;

        if (!fullName || typeof fullName !== "string") {
            res.status(400).json({ error: "Repository name is required" });
            return;
        }

        const cleanFullName = sanitizeRepoName(fullName);

        if (!cleanFullName || !cleanFullName.includes("/") || cleanFullName.split("/").length !== 2) {
            res.status(400).json({ error: "Repository must be in 'owner/repo' format" });
            return;
        }

        const repository = await prisma.repository.upsert({
            where: { fullName: cleanFullName },
            create: {
                fullName: cleanFullName,
                defaultBranch: (defaultBranch as string)?.trim() || "main",
            },
            update: {
                defaultBranch: (defaultBranch as string)?.trim() || "main",
            },
        });

        res.status(201).json({
            message: "Repository connected",
            repository,
            webhookUrl: `${req.protocol}://${req.get("host")}/api/webhooks/github`,
        });
    } catch (error) {
        console.error("Failed to connect repository:", error);
        res.status(500).json({ error: "Failed to connect repository" });
    }
};

export const deleteRepository = async (req: Request, res: Response) => {
    try {
        const id = String(req.params["id"]);

        await prisma.repository.delete({
            where: { id },
        });

        res.json({ message: "Repository disconnected", id });
    } catch (error) {
        console.error("Failed to delete repository:", error);
        res.status(500).json({ error: "Failed to disconnect repository" });
    }
};
