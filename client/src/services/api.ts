import axios from "axios";
import type { PullRequest, LogsResponse, PreviewStatusResponse, Deployment, Repository } from "../types/index.js";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const fetchRepositories = async (): Promise<Repository[]> => {
  const response = await api.get<{ repositories: Repository[] }>("/repositories");
  return response.data.repositories;
};

export const connectRepository = async (
  fullName: string,
  defaultBranch = "main"
): Promise<{ message: string; repository: Repository; webhookUrl: string }> => {
  const response = await api.post<{ message: string; repository: Repository; webhookUrl: string }>(
    "/repositories",
    { fullName, defaultBranch }
  );
  return response.data;
};

export const deleteRepository = async (id: string): Promise<void> => {
  await api.delete(`/repositories/${id}`);
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
