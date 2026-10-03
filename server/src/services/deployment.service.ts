import { prisma } from "../lib/prisma.js";
import { deployPreview, destroyPreviewsForPullRequest, destroyPreview } from "./preview.service.js";

export const createDeployment = async (
    pullRequestId: string,
    commitSha: string,
    repositoryFullName: string,
    branch: string
) => {
    await destroyPreviewsForPullRequest(pullRequestId);

    const deployment = await prisma.deployment.create({
        data: {
            pullRequestId,
            commitSha,
            status: "BUILDING",
        },
    });

    deployPreview({
        deploymentId: deployment.id,
        pullRequestId,
        repositoryFullName,
        commitSha,
        branch,
    }).catch((error) => {
        console.error(`Deployment ${deployment.id} failed:`, error);
    });

    return deployment;
};

export const updateDeploymentStatus = async (
    deploymentId: string,
    status: "BUILDING" | "DEPLOYING" | "LIVE" | "BUILD_FAILED" | "CLOSED" | "MERGED"
) => {
    return prisma.deployment.update({
        where: {
            id: deploymentId,
        },
        data: {
            status,
        },
    });
};

export const getLatestDeployment = async (pullRequestId: string) => {

    return prisma.deployment.findFirst({
        where: {
            pullRequestId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

export const cleanupExpiredDeployments = async () => {
    const expiredDeployments = await prisma.deployment.findMany({
        where: {
            status: "LIVE",
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    for (const deployment of expiredDeployments) {
        console.log(`Expiring deployment ${deployment.id}`);
        try {
            await destroyPreview(deployment.id);
            await prisma.deployment.update({
                where: { id: deployment.id },
                data: { status: "EXPIRED" } as any,
            });
        } catch (err) {
            console.error(`Failed to expire deployment ${deployment.id}:`, err);
        }
    }
};