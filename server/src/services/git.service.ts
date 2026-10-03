import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const WORKSPACES_ROOT = path.resolve("workspaces");

if (!fs.existsSync(WORKSPACES_ROOT)) {
    fs.mkdirSync(WORKSPACES_ROOT, { recursive: true });
}

export const cloneAtCommit = async (
    repositoryFullName: string,
    commitSha: string,
    deploymentId: string,
    branch: string = "main",
    accessToken?: string
): Promise<string> => {

    const workspacePath = path.join(WORKSPACES_ROOT, deploymentId);

    if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    }

    const token = accessToken || process.env.GITHUB_TOKEN?.trim();
    const repoUrl = token 
        ? `https://x-access-token:${token}@github.com/${repositoryFullName}.git`
        : `https://github.com/${repositoryFullName}.git`;

    // Clone the specific branch (shallow) to ensure the commit is reachable
    execSync(
        `git clone --single-branch --branch "${branch}" "${repoUrl}" "${workspacePath}"`,
        { stdio: "pipe", timeout: 120_000 }
    );

    // Checkout the exact commit SHA
    execSync(
        `git checkout ${commitSha}`,
        { cwd: workspacePath, stdio: "pipe", timeout: 30_000 }
    );

    return workspacePath;
};

export const cleanupWorkspace = async (
    deploymentId: string
): Promise<void> => {

    const workspacePath = path.join(WORKSPACES_ROOT, deploymentId);

    if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    }
};
