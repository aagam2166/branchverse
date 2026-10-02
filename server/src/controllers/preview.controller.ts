import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { destroyPreview, updateDeploymentInDb } from "../services/preview.service.js";
import { createDeployment } from "../services/deployment.service.js";

export const destroyPreviewHandler = async (req: Request, res: Response) => {
    try {
        const deploymentId = String(req.params["deploymentId"]);

        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
        });

        if (!deployment) {
            res.status(404).json({ error: "Deployment not found" });
            return;
        }

        await destroyPreview(deploymentId);

        await updateDeploymentInDb(deploymentId, {
            status: "CLOSED",
        });

        res.json({ message: "Preview environment destroyed", deploymentId });
    } catch (error) {
        console.error("Failed to destroy preview:", error);
        res.status(500).json({ error: "Failed to destroy preview environment" });
    }
};

export const redeployPreviewHandler = async (req: Request, res: Response) => {
    try {
        const pullRequestId = String(req.params["pullRequestId"]);

        const pullRequest = await prisma.pullRequest.findUnique({
            where: { id: pullRequestId },
            include: { repository: true },
        });

        if (!pullRequest) {
            res.status(404).json({ error: "Pull request not found" });
            return;
        }

        const deployment = await createDeployment(
            pullRequest.id,
            pullRequest.latestCommitSha,
            pullRequest.repository.fullName,
            pullRequest.branch
        );

        res.status(201).json({
            message: "Redeployment triggered",
            deployment,
        });
    } catch (error) {
        console.error("Failed to redeploy preview:", error);
        res.status(500).json({ error: "Failed to trigger redeployment" });
    }
};

export const getPreviewStatusHandler = async (req: Request, res: Response) => {
    try {
        const deploymentId = String(req.params["deploymentId"]);

        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
            include: {
                pullRequest: {
                    include: { repository: true },
                },
            },
        });

        if (!deployment) {
            res.status(404).json({ error: "Deployment not found" });
            return;
        }

        res.json({
            id: deployment.id,
            status: deployment.status,
            previewUrl: deployment.previewUrl,
            hostPort: deployment.hostPort,
            containerId: deployment.containerId,
            createdAt: deployment.createdAt,
            updatedAt: deployment.updatedAt,
            pullRequest: {
                id: deployment.pullRequest.id,
                number: deployment.pullRequest.number,
                title: deployment.pullRequest.title,
                branch: deployment.pullRequest.branch,
                author: deployment.pullRequest.author,
                repo: deployment.pullRequest.repository.fullName,
            },
        });
    } catch (error) {
        console.error("Failed to get preview status:", error);
        res.status(500).json({ error: "Failed to fetch preview status" });
    }
};
