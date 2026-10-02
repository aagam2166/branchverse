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
    deploymentId: string
): Promise<string> => {

    const workspacePath = path.join(WORKSPACES_ROOT, deploymentId);

    if (fs.existsSync(workspacePath)) {
        fs.rmSync(workspacePath, { recursive: true, force: true });
    }

    const repoUrl = `https://github.com/${repositoryFullName}.git`;

    execSync(
        `git clone --depth 1 "${repoUrl}" "${workspacePath}"`,
        { stdio: "pipe", timeout: 120_000 }
    );

    execSync(
        `git fetch origin ${commitSha}`,
        { cwd: workspacePath, stdio: "pipe", timeout: 120_000 }
    );

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
