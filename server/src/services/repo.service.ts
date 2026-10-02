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
    appDirectory?: string
) => {
    const [owner, repo] = repositoryFullName.split("/");
    if (!owner || !repo) {
        throw new Error(`Invalid repository name: ${repositoryFullName}`);
    }

    const publicUrl = process.env.PUBLIC_URL;
    if (!publicUrl) {
        throw new Error("PUBLIC_URL is not set in environment variables");
    }

    const webhookSecret = crypto.randomBytes(20).toString("hex");
    const webhookUrl = `${publicUrl}/api/webhooks/github`;

    let hookId: number | null = null;
    let manualWebhookRequired = false;

    // Try registering webhook on GitHub automatically
    try {
        const octokit = getOctokit();
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
        if (err.status === 401 || err.status === 403) {
            const reason = err.status === 401 ? "Token invalid/unauthenticated (401 Bad credentials)" : "Token lacks 'Webhooks: Read and write' permission (403 Forbidden)";
            console.warn(`[GitHub Webhook Warning] ${reason} for ${repositoryFullName}. Falling back to manual webhook setup.`);
            manualWebhookRequired = true;
        } else {
            throw err;
        }
    }

    // Upsert repository in DB with webhook info
    const repository = await (prisma as any).repository.upsert({
        where: { fullName: repositoryFullName },
        update: {
            appDirectory: appDirectory ?? null,
            webhookSecret,
            webhookId: hookId,
        },
        create: {
            fullName: repositoryFullName,
            appDirectory: appDirectory ?? null,
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
    const repository = await (prisma as any).repository.findUnique({
        where: { id: repositoryId },
    });

    if (!repository) {
        throw new Error("Repository not found");
    }

    if (repository.webhookId) {
        const [owner, repo] = repository.fullName.split("/");
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

    await prisma.repository.delete({ where: { id: repositoryId } });
};

export const listRepositories = async () => {
    return (prisma as any).repository.findMany({
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
