import { prisma } from "../lib/prisma.js";
import type { PullRequestWebhookPayload } from "../types/github.js";
import { createDeployment } from "./deployment.service.js";
import { destroyPreviewsForPullRequest } from "./preview.service.js";

export const processWebhook = async (
  event: string | undefined,
  payload: PullRequestWebhookPayload
): Promise<void> => {
  if (event !== "pull_request") {
    return;
  }

  const pr = payload.pull_request;
  const repositoryName = payload.repository.full_name;

  const repository = await prisma.repository.upsert({
    where: {
      fullName: repositoryName,
    },
    update: {},
    create: {
      fullName: repositoryName,
    },
  });

  const pullRequest = await prisma.pullRequest.upsert({
    where: {
      repositoryId_number: {
        repositoryId: repository.id,
        number: payload.number,
      },
    },
    update: {
      title: pr.title,
      author: pr.user.login,
      branch: pr.head.ref,
      latestCommitSha: pr.head.sha,
      state:
        payload.action === "closed"
          ? pr.merged
            ? "MERGED"
            : "CLOSED"
          : "OPEN",
      closedAt: payload.action === "closed" ? new Date() : null,
    },
    create: {
      repositoryId: repository.id,
      number: payload.number,
      title: pr.title,
      author: pr.user.login,
      branch: pr.head.ref,
      latestCommitSha: pr.head.sha,
      state:
        payload.action === "closed"
          ? pr.merged
            ? "MERGED"
            : "CLOSED"
          : "OPEN",
      closedAt: payload.action === "closed" ? new Date() : null,
    },
  });

  switch (payload.action) {
    case "opened":
    case "synchronize":
      await createDeployment(
        pullRequest.id,
        pr.head.sha,
        repositoryName,
        pr.head.ref
      );
      break;

    case "closed":
      await destroyPreviewsForPullRequest(pullRequest.id);

      await prisma.deployment.updateMany({
        where: {
          pullRequestId: pullRequest.id,
          status: {
            notIn: ["CLOSED", "MERGED"],
          },
        },
        data: {
          status: pr.merged ? "MERGED" : "CLOSED",
        },
      });
      break;
  }
};