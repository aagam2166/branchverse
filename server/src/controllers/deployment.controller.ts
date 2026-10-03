import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import dockerService from "../services/docker.service.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

export const listPullRequests = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.json({ pullRequests: [] });
            return;
        }

        const pullRequests = await prisma.pullRequest.findMany({
            where: {
                repository: {
                    userId: userId,
                },
            },
            include: {
                repository: true,
                deployments: {
                    orderBy: { createdAt: "desc" },
                    take: 10,
                },
            },
            orderBy: { updatedAt: "desc" },
        });

        res.json({ pullRequests });
    } catch (error) {
        console.error("Failed to list pull requests:", error);
        res.status(500).json({ error: "Failed to fetch pull requests" });
    }
};

export const getDeploymentsForPR = async (req: Request, res: Response) => {
    try {
        const pullRequestId = String(req.params["pullRequestId"]);

        const pullRequest = await prisma.pullRequest.findUnique({
            where: { id: pullRequestId },
            include: {
                repository: true,
                deployments: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!pullRequest) {
            res.status(404).json({ error: "Pull request not found" });
            return;
        }

        res.json({ pullRequest });
    } catch (error) {
        console.error("Failed to get deployments:", error);
        res.status(500).json({ error: "Failed to fetch deployments" });
    }
};

export const getDeploymentLogs = async (req: Request, res: Response) => {
    try {
        const deploymentId = String(req.params["deploymentId"]);

        const deployment = await prisma.deployment.findUnique({
            where: { id: deploymentId },
        });

        if (!deployment) {
            res.status(404).json({ error: "Deployment not found" });
            return;
        }

        let containerLogs = "";
        if (deployment.containerId && deployment.status === "LIVE") {
            try {
                containerLogs = await dockerService.getContainerLogs(
                    deployment.containerId
                );
            } catch {
                containerLogs = "Container logs unavailable";
            }
        }

        res.json({
            buildLogs: deployment.buildLogs ?? "",
            containerLogs,
            errorMessage: deployment.errorMessage,
        });
    } catch (error) {
        console.error("Failed to get logs:", error);
        res.status(500).json({ error: "Failed to fetch logs" });
    }
};
