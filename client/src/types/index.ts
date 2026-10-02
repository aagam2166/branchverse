export type DeploymentStatus = 
  | "BUILDING" 
  | "DEPLOYING" 
  | "LIVE" 
  | "BUILD_FAILED" 
  | "CLOSED" 
  | "MERGED";

export type PullRequestState = "OPEN" | "CLOSED" | "MERGED";

export interface Repository {
  id: string;
  fullName: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  pullRequestId: string;
  commitSha: string;
  status: DeploymentStatus;
  previewUrl: string | null;
  containerId: string | null;
  hostPort: number | null;
  buildLogs: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PullRequest {
  id: string;
  repositoryId: string;
  number: number;
  title: string;
  author: string;
  branch: string;
  latestCommitSha: string;
  state: PullRequestState;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  repository: Repository;
  deployments: Deployment[];
}

export interface LogsResponse {
  buildLogs: string;
  containerLogs: string;
  errorMessage: string | null;
}

export interface PreviewStatusResponse {
  id: string;
  status: DeploymentStatus;
  previewUrl: string | null;
  hostPort: number | null;
  containerId: string | null;
  createdAt: string;
  updatedAt: string;
  pullRequest: {
    id: string;
    number: number;
    title: string;
    branch: string;
    author: string;
    repo: string;
  };
}
