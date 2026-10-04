import axios from "axios";
import type { PullRequest, LogsResponse, PreviewStatusResponse, Deployment, Repository } from "../types/index.js";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("branchverse_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface UserGitHubRepo {
  id: number;
  fullName: string;
  name: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
}

export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get<{ user: User | null }>("/auth/me");
    return response.data.user;
  } catch (err) {
    return null;
  }
};

export const getGitHubLoginUrl = async (): Promise<string> => {
  const response = await api.get<{ url: string }>("/auth/github");
  return response.data.url;
};

export const fetchUserGitHubRepos = async (): Promise<UserGitHubRepo[]> => {
  const response = await api.get<{ repositories: UserGitHubRepo[] }>("/auth/user-repos");
  return response.data.repositories || [];
};

export const fetchRepositories = async (): Promise<Repository[]> => {
  const response = await api.get<{ repositories: Repository[] }>("/repos");
  return response.data.repositories;
};

export const connectRepository = async (
  repositoryFullName: string,
  appDirectory?: string,
  buildCommand?: string,
  installCommand?: string,
  productionUrl?: string
): Promise<{ message: string; repository: Repository; webhookUrl: string; warning?: string }> => {
  const response = await api.post<{ message: string; repository: Repository; webhookUrl: string; warning?: string }>(
    "/repos/connect",
    { repositoryFullName, appDirectory, buildCommand, installCommand, productionUrl }
  );
  return response.data;
};

export const inspectRepository = async (
  repositoryFullName: string,
  appDirectory?: string
): Promise<{ type: string | null; path: string }> => {
  const response = await api.post<{ type: string | null; path: string }>("/repos/inspect", {
    repositoryFullName,
    appDirectory,
  });
  return response.data;
};

export const deleteRepository = async (id: string): Promise<void> => {
  await api.delete(`/repos/${id}/disconnect`);
};

export const deployBaseline = async (repositoryId: string): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(`/repos/${repositoryId}/deploy-baseline`);
  return response.data;
};

export interface BaselineStatusResponse {
  status: string | null;
  url: string | null;
  containerId: string | null;
  port: number | null;
}

export const fetchBaselineStatus = async (repositoryId: string): Promise<BaselineStatusResponse> => {
  const response = await api.get<BaselineStatusResponse>(`/repos/${repositoryId}/baseline-status`);
  return response.data;
};

export const fetchPullRequests = async (): Promise<PullRequest[]> => {
  const response = await api.get<{ pullRequests: PullRequest[] }>("/deployments");
  return response.data.pullRequests || [];
};

export const fetchPullRequestDetails = async (pullRequestId: string): Promise<PullRequest> => {
  const response = await api.get<{ pullRequest: PullRequest }>(`/deployments/${pullRequestId}`);
  return response.data.pullRequest;
};

export const fetchDeploymentLogs = async (
  pullRequestId: string,
  deploymentId: string
): Promise<LogsResponse> => {
  const response = await api.get<LogsResponse>(`/deployments/${pullRequestId}/logs/${deploymentId}`);
  return response.data;
};

export const fetchPreviewStatus = async (
  deploymentId: string
): Promise<PreviewStatusResponse> => {
  const response = await api.get<PreviewStatusResponse>(`/previews/${deploymentId}/status`);
  return response.data;
};

export const redeployPullRequest = async (
  pullRequestId: string
): Promise<{ message: string; deployment: Deployment }> => {
  const response = await api.post<{ message: string; deployment: Deployment }>(
    `/previews/${pullRequestId}/redeploy`
  );
  return response.data;
};

export const destroyPreviewEnvironment = async (
  deploymentId: string
): Promise<{ message: string; deploymentId: string }> => {
  const response = await api.post<{ message: string; deploymentId: string }>(
    `/previews/${deploymentId}/destroy`
  );
  return response.data;
};

export const expireDeployment = async (
  deploymentId: string
): Promise<{ message: string }> => {
  const response = await api.post<{ message: string }>(
    `/deployments/${deploymentId}/expire`
  );
  return response.data;
};

export const triggerSimulatedWebhook = async (payload: {
  action: "opened" | "synchronize" | "closed";
  number: number;
  repository: { full_name: string };
  pull_request: {
    title: string;
    user: { login: string };
    head: { ref: string; sha: string };
    merged?: boolean;
  };
}) => {
  const response = await api.post("/webhooks/github", payload, {
    headers: {
      "x-github-event": "pull_request",
    },
  });
  return response.data;
};

export default api;
