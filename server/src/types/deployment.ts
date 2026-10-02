export type DeploymentStatus =
  | "BUILDING"
  | "DEPLOYING"
  | "LIVE"
  | "BUILD_FAILED"
  | "CLOSED"
  | "MERGED";

export interface Deployment {
    id: string;
    repository: string;
    prNumber: number;
    branch: string;
    commitSha: string;
    status: DeploymentStatus;
    previewUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DeployPreviewRequest {
    deploymentId: string;
    pullRequestId: string;
    repositoryFullName: string;
    commitSha: string;
    branch: string;
}

export interface DeployPreviewResult {
    status: "LIVE" | "BUILD_FAILED" | "DEPLOY_FAILED";
    containerId?: string;
    containerName?: string;
    hostPort?: number;
    previewUrl?: string;
    buildLogs: string[];
    errorMessage?: string;
}
