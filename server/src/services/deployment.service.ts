import {prisma} from "../lib/prisma.js";

export const createDeployment = async (
    pullRequestId: string,
    commitSha: string
) => {
    return prisma.deployment.create({
        data: {
            pullRequestId,
            commitSha,
            status: "BUILDING",
        },
    });
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