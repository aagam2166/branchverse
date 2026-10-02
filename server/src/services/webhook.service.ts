import type { PullRequestWebhookPayload } from "../types/github.js";

export const processWebhook = (
  event: string | undefined,
  payload: PullRequestWebhookPayload
): void => {
  console.log("GitHub Event:", event);

  if (event !== "pull_request") {
    return;
  }

  const pr = payload.pull_request;

  console.log("Repository:", payload.repository.full_name);
  console.log("PR Number:", payload.number);
  console.log("Branch:", pr.head.ref);
  console.log("Commit:", pr.head.sha);
  console.log("Action:", payload.action);

  switch (payload.action) {
    case "opened":
      console.log("Create preview environment");
      break;

    case "synchronize":
      console.log("Redeploy preview environment");
      break;

    case "closed":
      if (pr.merged) {
        console.log("PR merged");
      } else {
        console.log("PR closed - destroy preview");
      }
      break;
  }
};