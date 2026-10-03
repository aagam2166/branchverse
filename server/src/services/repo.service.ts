import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import { prisma } from "../lib/prisma.js";

const getOctokit = () => {
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
        throw new Error("GITHUB_TOKEN is missing in environment variables (.env)");
    }
    return new Octokit({ auth: token });
};

export const connectRepository = async (
    repositoryFullName: string,
    appDirectory?: string,
    buildCommand?: string,
    installCommand?: string,
    productionUrl?: string
) => {
    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repositoryFullName}`);
    }

    const publicUrl = process.env.PUBLIC_URL;
    if (!publicUrl) {
        throw new Error("PUBLIC_URL is not set in environment variables");
    }

    const octokit = getOctokit();
    
    // Auto-fetch production URL from GitHub if not provided
    if (!productionUrl) {
        try {
            const { data: githubRepo } = await octokit.repos.get({ owner, repo });
            if (githubRepo.homepage) {
                // Ensure it has http(s)
                productionUrl = githubRepo.homepage.startsWith('http') 
                    ? githubRepo.homepage 
                    : `https://${githubRepo.homepage}`;
            }
        } catch (err) {
            console.warn(`Could not fetch repository info for ${repositoryFullName}`, err);
        }
    }

    const webhookSecret = crypto.randomBytes(20).toString("hex");
    const webhookUrl = `${publicUrl}/api/webhooks/github`;

    let hookId: number | null = null;
    let manualWebhookRequired = false;

    // Try registering webhook on GitHub automatically
    try {
        const { data: hook } = await octokit.repos.createWebhook({
            owner,
            repo,
            config: {
                url: webhookUrl,
                content_type: "json",
                secret: webhookSecret,
                insecure_ssl: "0",
            },
            events: ["pull_request"],
            active: true,
        });
        hookId = hook.id;
    } catch (err: any) {
        if (err.status === 401 || err.status === 403 || err.status === 404) {
            const reason = err.status === 404 ? "Repository not found or lack of access (404 Not Found)" : err.status === 401 ? "Token invalid/unauthenticated (401 Bad credentials)" : "Token lacks 'Webhooks: Read and write' permission (403 Forbidden)";
            console.warn(`[GitHub Webhook Warning] ${reason} for ${repositoryFullName}. Falling back to manual webhook setup.`);
            manualWebhookRequired = true;
        } else {
            throw err;
        }
    }

    // Upsert repository in DB with webhook info
    const repository = await prisma.repository.upsert({
        where: { fullName: repositoryFullName },
        update: {
            appDirectory: appDirectory ?? null,
            buildCommand: buildCommand ?? null,
            installCommand: installCommand ?? null,
            productionUrl: productionUrl ?? null,
            webhookSecret,
            webhookId: hookId,
        },
        create: {
            fullName: repositoryFullName,
            appDirectory: appDirectory ?? null,
            buildCommand: buildCommand ?? null,
            installCommand: installCommand ?? null,
            productionUrl: productionUrl ?? null,
            webhookSecret,
            webhookId: hookId,
        },
    });

    return {
        repository,
        webhookId: hookId,
        webhookUrl,
        webhookSecret,
        manualWebhookRequired,
        ...(manualWebhookRequired && {
            warning: "GitHub token lacks webhook creation permissions. Please add the webhook manually in GitHub repository settings.",
        }),
    };
};

export const disconnectRepository = async (repositoryId: string) => {
    const repository = await prisma.repository.findUnique({
        where: { id: repositoryId },
    });

    if (!repository) {
        throw new Error("Repository not found");
    }

    if (repository.webhookId) {
        const [owner, repo] = repository.fullName.split("/");
        if (owner && repo) {
            try {
                await getOctokit().repos.deleteWebhook({
                    owner,
                    repo,
                    hook_id: repository.webhookId,
                });
            } catch (err) {
                // Webhook might already be deleted on GitHub side — log but continue
                console.warn(`Could not delete GitHub webhook ${repository.webhookId}:`, err);
            }
        }
    }

    await prisma.repository.delete({ where: { id: repositoryId } });
};

export const listRepositories = async () => {
    return prisma.repository.findMany({
        include: {
            pullRequests: {
                orderBy: { updatedAt: "desc" },
                take: 1,
                include: {
                    deployments: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

export const inspectRepository = async (
    repositoryFullName: string,
    appDirectory?: string
): Promise<{ type: "DOCKERFILE" | "NODE" | "STATIC" | "PYTHON" | "GO" | null; path: string }> => {
    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repositoryFullName}`);
    }

    const octokit = getOctokit();
    
    // Helper to check files in a directory using GitHub API
    const checkType = async (dirPath: string): Promise<"DOCKERFILE" | "NODE" | "STATIC" | "PYTHON" | "GO" | null> => {
        try {
            const { data } = await octokit.repos.getContent({
                owner,
                repo,
                path: dirPath,
            });
            
            if (Array.isArray(data)) {
                const files = data.map((d: any) => d.name);
                if (files.includes("Dockerfile")) return "DOCKERFILE";
                if (files.includes("package.json")) return "NODE";
                if (files.includes("requirements.txt") || files.includes("pyproject.toml")) return "PYTHON";
                if (files.includes("go.mod")) return "GO";
                if (files.includes("index.html")) return "STATIC";
            }
        } catch (err) {
            // Directory might not exist or other error
        }
        return null;
    };

    let detectedType = null;
    let finalPath = appDirectory || "";

    if (appDirectory && appDirectory !== ".") {
        detectedType = await checkType(appDirectory);
    } else {
        detectedType = await checkType("");
        if (!detectedType) {
            const frontendDirs = ["client", "frontend", "web", "app", "src"];
            for (const dir of frontendDirs) {
                const type = await checkType(dir);
                if (type) {
                    detectedType = type;
                    finalPath = dir;
                    break;
                }
            }
        }
    }

    return {
        type: detectedType,
        path: finalPath || "root",
    };
};
