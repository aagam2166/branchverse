import { prisma } from "../lib/prisma.js";
import { deployPreview, destroyPreviewsForPullRequest } from "./preview.service.js";

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