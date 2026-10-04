import path from "path";
import fs from "fs";
import dockerService from "./docker.service.js";
import { cloneAtCommit, cleanupWorkspace } from "./git.service.js";
import { prisma } from "../lib/prisma.js";

const PREVIEW_DOCKERFILE = path.resolve("docker", "Dockerfile.preview");
const CONTAINER_INTERNAL_PORT = 3000;

export const deployBaseline = async (
    repositoryId: string,
    repositoryFullName: string,
    commitSha: string,
    branch: string
) => {
    const buildLogs: string[] = [];
    const deploymentId = `baseline-${repositoryId}`;

    try {
        await prisma.repository.update({
            where: { id: repositoryId },
            data: { baselineStatus: "BUILDING" },
        });

        const repoConfig = await (prisma as any).repository.findUnique({
            where: { id: repositoryId },
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
            appPath = path.join(workspacePath, repoConfig.appDirectory);
            detectedType = checkType(appPath);
        } else {
            detectedType = checkType(workspacePath);
            if (!detectedType) {
                const frontendDirs = ["client", "frontend", "web", "app", "src"];
                for (const dir of frontendDirs) {
                    const candidatePath = path.join(workspacePath, dir);
                    if (fs.existsSync(candidatePath)) {
                        const type = checkType(candidatePath);
                        if (type) {
                            appPath = candidatePath;
                            detectedType = type;
                            break;
                        }
                    }
                }
            }
        }

        if (!detectedType) {
            throw new Error("Unable to detect application type.");
        }

        let containerPort = CONTAINER_INTERNAL_PORT;

        if (detectedType === "DOCKERFILE") {
            buildLogs.push("Using custom Dockerfile");
        } else {
            const templateName = `Dockerfile.${detectedType.toLowerCase()}`;
            const dockerfileToUse = path.resolve("docker", templateName);
            
            if (detectedType === "STATIC") {
                containerPort = 80;
            }

            if (fs.existsSync(dockerfileToUse)) {
                fs.copyFileSync(dockerfileToUse, path.join(appPath, "Dockerfile"));
            } else {
                fs.copyFileSync(PREVIEW_DOCKERFILE, path.join(appPath, "Dockerfile"));
            }

            const dockerfilePath = path.join(appPath, "Dockerfile");
            let dockerfileContent = fs.readFileSync(dockerfilePath, "utf-8");
            
            if (repoConfig?.installCommand) {
                dockerfileContent = dockerfileContent.replace(/RUN npm install/g, `RUN ${repoConfig.installCommand}`);
            }
            
            if (repoConfig?.buildCommand) {
                const lines = dockerfileContent.split("\n");
                const insertIndex = lines.findIndex(l => l.startsWith("EXPOSE") || l.startsWith("CMD"));
                if (insertIndex !== -1) {
                    lines.splice(insertIndex, 0, `RUN ${repoConfig.buildCommand}`);
                    dockerfileContent = lines.join("\n");
                }
            }
            fs.writeFileSync(dockerfilePath, dockerfileContent);
        }

        const imageName = `branchverse-baseline-${repositoryId}`.toLowerCase();
        buildLogs.push(`Building Docker image: ${imageName}...`);

        const dockerBuildLogs = await dockerService.buildImage(appPath, imageName);
        buildLogs.push(...dockerBuildLogs);
        
        await prisma.repository.update({
            where: { id: repositoryId },
            data: { baselineStatus: "DEPLOYING" },
        });

        // Destroy previous baseline container if any
        const oldRepo = await prisma.repository.findUnique({ where: { id: repositoryId } });
        if (oldRepo?.baselineContainerId) {
            try {
                await dockerService.stopAndRemoveContainer(oldRepo.baselineContainerId);
            } catch (e) {}
        }

        const containerName = `branchverse-baseline-${repositoryId}`.toLowerCase();
        // Remove existing container if it exists with same name
        try {
            await dockerService.stopAndRemoveContainer(containerName);
        } catch(e) {}

        const container = await dockerService.createContainer({
            imageName,
            containerName,
            containerPort: containerPort,
        });

        const containerId = container.id;
        await dockerService.startContainer(containerId);

        const hostPort = await dockerService.getContainerPort(containerId, containerPort);
        const serverHost = process.env.SERVER_HOST || "localhost";
        const baselineUrl = `http://${serverHost}:${hostPort}`;

        await prisma.repository.update({
            where: { id: repositoryId },
            data: {
                baselineStatus: "LIVE",
                baselineUrl,
                baselineContainerId: containerId,
                baselinePort: hostPort,
            },
        });

        return {
            status: "LIVE",
            containerId,
            hostPort,
            baselineUrl,
            buildLogs,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        buildLogs.push(`FAILED: ${errorMessage}`);

        await prisma.repository.update({
            where: { id: repositoryId },
            data: { baselineStatus: "FAILED" },
        }).catch(() => {});

        await cleanupWorkspace(deploymentId).catch(() => { });

        return {
            status: "FAILED",
            buildLogs,
            errorMessage,
        };
    }
};
