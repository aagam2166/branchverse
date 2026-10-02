//Here we are defining how PullRequestWebhookPayload should look like
//This helps for suggestions and tells TS what structure to expect.

export interface PullRequestWebhookPayload {
  action: "opened" | "synchronize" | "closed";

  number: number;

  pull_request: {
    merged: boolean;

    head: {
      ref: string;
      sha: string;
    };
  };

  repository: {
    full_name: string;
  };
}