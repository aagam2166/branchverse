import axios from "axios";
import type { PullRequest, LogsResponse, PreviewStatusResponse, Deployment, Repository } from "../types/index.js";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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
