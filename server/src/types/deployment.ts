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

