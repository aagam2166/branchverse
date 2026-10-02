import path from "path";
import fs from "fs";
import dockerService from "./docker.service.js";
import { cloneAtCommit, cleanupWorkspace } from "./git.service.js";
import { prisma } from "../lib/prisma.js";
import type { DeployPreviewRequest, DeployPreviewResult } from "../types/deployment.js";

const PREVIEW_DOCKERFILE = path.resolve("docker", "Dockerfile.preview");
const CONTAINER_INTERNAL_PORT = 3000;

export const deployPreview = async (
    request: DeployPreviewRequest
): Promise<DeployPreviewResult> => {
    const { deploymentId, repositoryFullName, commitSha } = request;
    const buildLogs: string[] = [];

    try {
        await updateDeploymentInDb(deploymentId, { status: "BUILDING" });
        buildLogs.push(`Cloning ${repositoryFullName} at commit ${commitSha}...`);

        const workspacePath = await cloneAtCommit(
            repositoryFullName,
            commitSha,
            deploymentId
        );
        buildLogs.push(`Workspace ready at ${workspacePath}`);

        fs.copyFileSync(
            PREVIEW_DOCKERFILE,
            path.join(workspacePath, "Dockerfile")
        );
        buildLogs.push("Dockerfile copied to workspace");

        const imageName = `branchverse-preview-${deploymentId}`.toLowerCase();
        buildLogs.push(`Building Docker image: ${imageName}...`);

        const dockerBuildLogs = await dockerService.buildImage(
            workspacePath,
            imageName
        );
        buildLogs.push(...dockerBuildLogs);
        buildLogs.push("Docker image built successfully");

        await updateDeploymentInDb(deploymentId, { status: "DEPLOYING" });
        const containerName = `branchverse-${deploymentId}`.toLowerCase();

        const container = await dockerService.createContainer({
            imageName,
            containerName,
            containerPort: CONTAINER_INTERNAL_PORT,
        });

        const containerId = container.id;
        buildLogs.push(`Container created: ${containerName} (${containerId.substring(0, 12)})`);

        await dockerService.startContainer(containerId);
        buildLogs.push("Container started");

        const hostPort = await dockerService.getContainerPort(
            containerId,
            CONTAINER_INTERNAL_PORT
        );

        const host = process.env.APP_HOST || "localhost";
        const previewUrl = `http://${host}:${hostPort}`;
        buildLogs.push(`Preview LIVE at ${previewUrl}`);

        await updateDeploymentInDb(deploymentId, {
            status: "LIVE",
            previewUrl,
            containerId,
            hostPort,
            buildLogs: buildLogs.join("\n"),
        });

        return {
            status: "LIVE",
            containerId,
            containerName,
            hostPort,
            previewUrl,
            buildLogs,
        };
    } catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);

        buildLogs.push(`FAILED: ${errorMessage}`);

        const status: "BUILD_FAILED" | "DEPLOY_FAILED" = buildLogs.some(
            log => log.includes("Docker image built successfully")
        )
            ? "DEPLOY_FAILED"
            : "BUILD_FAILED";

        await updateDeploymentInDb(deploymentId, {
            status: "BUILD_FAILED",
            errorMessage,
            buildLogs: buildLogs.join("\n"),
        }).catch(() => {
            console.error(`Failed to update deployment ${deploymentId} status in DB`);
        });

        await destroyPreview(deploymentId).catch(() => { });

        return {
            status,
            buildLogs,
            errorMessage,
        };
    }
};

export const destroyPreview = async (
    deploymentId: string
): Promise<void> => {
    const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
    });

    if (deployment?.containerId) {
        try {
            await dockerService.stopAndRemoveContainer(deployment.containerId);
        } catch {
        }
    }

    await cleanupWorkspace(deploymentId);
};

export const destroyPreviewsForPullRequest = async (
    pullRequestId: string
): Promise<void> => {
    const activeDeployments = await prisma.deployment.findMany({
        where: {
            pullRequestId,
            status: { in: ["LIVE", "DEPLOYING", "BUILDING"] },
        },
    });

    for (const deployment of activeDeployments) {
        await destroyPreview(deployment.id);
    }
};

export const updateDeploymentInDb = async (
    deploymentId: string,
    data: {
        status?: "BUILDING" | "DEPLOYING" | "LIVE" | "BUILD_FAILED" | "CLOSED" | "MERGED";
        previewUrl?: string;
        containerId?: string;
        hostPort?: number;
        buildLogs?: string;
        errorMessage?: string;
    }
) => {
    return prisma.deployment.update({
        where: { id: deploymentId },
        data,
    });
};
