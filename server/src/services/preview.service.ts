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
    const { deploymentId, repositoryFullName, commitSha, branch } = request;
    const buildLogs: string[] = [];

    try {
        await updateDeploymentInDb(deploymentId, { status: "BUILDING" });
        const repoConfig = await (prisma as any).repository.findUnique({
            where: { fullName: repositoryFullName },
            select: {
                appDirectory: true,
                buildCommand: true,
                installCommand: true,
                user: { select: { accessToken: true } }
            },
        });

        const userAccessToken = repoConfig?.user?.accessToken;

        const workspacePath = await cloneAtCommit(
            repositoryFullName,
            commitSha,
            deploymentId,
            branch,
            userAccessToken
        );
        buildLogs.push(`Workspace ready at ${workspacePath}`);

        let appPath = workspacePath;
        let detectedType: "DOCKERFILE" | "NODE" | "STATIC" | "PYTHON" | "GO" | null = null;

        const checkType = (dirPath: string) => {
            if (fs.existsSync(path.join(dirPath, "Dockerfile"))) return "DOCKERFILE";
            if (fs.existsSync(path.join(dirPath, "package.json"))) return "NODE";
            if (fs.existsSync(path.join(dirPath, "requirements.txt")) || fs.existsSync(path.join(dirPath, "pyproject.toml"))) return "PYTHON";
            if (fs.existsSync(path.join(dirPath, "go.mod"))) return "GO";
            if (fs.existsSync(path.join(dirPath, "index.html"))) return "STATIC";
            return null;
        };

        if (repoConfig?.appDirectory && repoConfig.appDirectory !== ".") {
            // Use explicitly configured directory
            appPath = path.join(workspacePath, repoConfig.appDirectory);
            buildLogs.push(`Using configured app directory: ${repoConfig.appDirectory}/`);
            detectedType = checkType(appPath);
        } else {
            // Auto-detect from root first
            detectedType = checkType(workspacePath);
            if (!detectedType) {
                // Scan 1-level deep subfolders
                const frontendDirs = ["client", "frontend", "web", "app", "src"];
                for (const dir of frontendDirs) {
                    const candidatePath = path.join(workspacePath, dir);
                    if (fs.existsSync(candidatePath)) {
                        const type = checkType(candidatePath);
                        if (type) {
                            appPath = candidatePath;
                            detectedType = type;
                            buildLogs.push(`Auto-detected ${type} in directory: ${dir}/`);
                            break;
                        }
                    }
                }
            } else {
                buildLogs.push(`Auto-detected ${detectedType} in root directory`);
            }
        }

        if (!detectedType) {
            throw new Error("Unable to detect application type. Please add a Dockerfile or configure the Root Directory in repository settings.");
        }

        let containerPort = CONTAINER_INTERNAL_PORT;

        if (detectedType === "DOCKERFILE") {
            buildLogs.push("Using custom Dockerfile from repository");
        } else {
            const templateName = `Dockerfile.${detectedType.toLowerCase()}`;
            const dockerfileToUse = path.resolve("docker", templateName);

            if (detectedType === "STATIC") {
                containerPort = 80;
            }

            if (fs.existsSync(dockerfileToUse)) {
                fs.copyFileSync(dockerfileToUse, path.join(appPath, "Dockerfile"));
                buildLogs.push(`Copied template ${templateName} to workspace`);
            } else {
                fs.copyFileSync(PREVIEW_DOCKERFILE, path.join(appPath, "Dockerfile"));
                buildLogs.push("Default Dockerfile copied to workspace");
            }

            // Inject custom commands if configured
            const dockerfilePath = path.join(appPath, "Dockerfile");
            let dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");

            if (repoConfig?.installCommand) {
                dockerfileContent = dockerfileContent.replace(/RUN npm install/g, `RUN ${repoConfig.installCommand}`);
                buildLogs.push(`Injected custom install command: ${repoConfig.installCommand}`);
            }

            if (repoConfig?.buildCommand) {
                const lines = dockerfileContent.split("\n");
                const insertIndex = lines.findIndex(l => l.startsWith("EXPOSE") || l.startsWith("CMD"));
                if (insertIndex !== -1) {
                    lines.splice(insertIndex, 0, `RUN ${repoConfig.buildCommand}`);
                    dockerfileContent = lines.join("\n");
                    buildLogs.push(`Injected custom build command: ${repoConfig.buildCommand}`);
                }
            } else if (detectedType === "NODE") {
                const packageJsonPath = path.join(appPath, "package.json");
                if (fs.existsSync(packageJsonPath)) {
                    try {
                        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
                        if (pkg.scripts?.build) {
                            const lines = dockerfileContent.split("\n");
                            const insertIndex = lines.findIndex(l => l.startsWith("EXPOSE") || l.startsWith("CMD"));
                            if (insertIndex !== -1) {
                                lines.splice(insertIndex, 0, `RUN npm run build`);
                                dockerfileContent = lines.join("\n");
                                buildLogs.push(`Auto-injected build command: npm run build`);
                            }
                        }
                        
                        let finalCmd = 'CMD ["npm", "start"]';
                        if (!pkg.scripts?.start) {
                            if (pkg.scripts?.preview) {
                                finalCmd = 'CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]';
                            } else if (pkg.scripts?.dev) {
                                finalCmd = 'CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]';
                            }
                        }
                        dockerfileContent = dockerfileContent.replace(/CMD \["npm", "start"\]/, finalCmd);
                    } catch (e) {
                        console.error("Failed to parse package.json", e);
                    }
                }
            }

            fs.writeFileSync(dockerfilePath, dockerfileContent);
        }

        const imageName = `branchverse-preview-${deploymentId}`.toLowerCase();
        buildLogs.push(`Building Docker image: ${imageName}...`);

        const dockerBuildLogs = await dockerService.buildImage(
            appPath,
            imageName
        );
        buildLogs.push(...dockerBuildLogs);
        buildLogs.push("Docker image built successfully");

        await updateDeploymentInDb(deploymentId, { status: "DEPLOYING" });
        const containerName = `branchverse-${deploymentId}`.toLowerCase();

        const container = await dockerService.createContainer({
            imageName,
            containerName,
            containerPort: containerPort,
        });

        const containerId = container.id;
        buildLogs.push(`Container created: ${containerName} (${containerId.substring(0, 12)})`);

        await dockerService.startContainer(containerId);
        buildLogs.push("Container started");

        const hostPort = await dockerService.getContainerPort(
            containerId,
            containerPort
        );

        const serverHost = process.env.SERVER_HOST || "localhost";
        const previewUrl = `http://${serverHost}:${hostPort}`;
        buildLogs.push(`Preview LIVE at ${previewUrl}`);

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 2); // Configurable expiry time, default 2 hours

        await updateDeploymentInDb(deploymentId, {
            status: "LIVE",
            previewUrl,
            containerId,
            hostPort,
            buildLogs: buildLogs.join("\n"),
            expiresAt,
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

        // Mark old deployments as superseded instead of deleting them
        await updateDeploymentInDb(deployment.id, {
            status: "SUPERSEDED"
        });
    }
};

export const updateDeploymentInDb = async (
    deploymentId: string,
    data: {
        status?: "BUILDING" | "DEPLOYING" | "LIVE" | "BUILD_FAILED" | "CLOSED" | "MERGED" | "EXPIRED" | "SUPERSEDED";
        previewUrl?: string;
        containerId?: string;
        hostPort?: number;
        buildLogs?: string;
        errorMessage?: string;
        expiresAt?: Date | null;
    }
) => {
    return prisma.deployment.update({
        where: { id: deploymentId },
        data: data as any,
    });
};
