# BranchVerse

**Every Pull Request, its own preview universe.**

BranchVerse connects GitHub Pull Requests to temporary, Docker-based preview deployments. It receives GitHub `pull_request` webhooks, checks out the pull request commit, builds an image, runs it in a container on an allocated host port, and records deployment status and logs in PostgreSQL. The dashboard presents connected repositories, pull requests, deployment state, logs, and preview links.

## Project Overview

BranchVerse gives a pull request an isolated running application so developers and reviewers can inspect a change before it is merged. Repository webhooks start deployments when a PR is opened or receives new commits; closing a PR stops its active preview containers. A preview currently runs on the machine hosting the BranchVerse backend and its URL uses that machine's `localhost` host port. It is therefore directly reachable from that host; making it reachable to other users requires suitable network routing or a reverse proxy.

```text
GitHub Pull Request → Webhook → BranchVerse Backend → Build/Deployment
  → Docker Preview Environment → Preview URL
```

## Features

### GitHub Integration

- GitHub OAuth sign-in with a seven-day JWT session.
- Lists up to 50 recently updated repositories for the authenticated account.
- Uses Octokit to read repository metadata, register/delete repository webhooks, look up a default-branch commit for a baseline deployment, and comment on a PR after a preview comes live.
- Clones the exact PR commit. A logged-in repository's GitHub access token is used for private repository cloning; `GITHUB_TOKEN` is the fallback used by other GitHub operations.

### Webhooks

- Repository connection attempts to register an active GitHub `pull_request` webhook automatically. If GitHub denies registration for access/permission reasons, the service logs a warning and the UI provides instructions for manual setup; the current connect controller does not return the service's warning field.
- Handles `opened`, `synchronize`, and `closed` actions. Other GitHub event types and pull-request actions are ignored.
- Accepts GitHub's `X-GitHub-Event` header and JSON payload. If a `sha256` signature and a stored repository secret are present, it checks the HMAC signature.

### Preview Environment

- Builds and runs each preview in a Docker container with a Docker-assigned host port.
- Detects an app directory from the configured directory or checks the repository root and selected common subdirectories (`client`, `frontend`, `web`, `app`, `src`).
- Stores status, URL, container ID, port, commit, build logs, and errors for the deployment.
- Posts the live preview URL as a GitHub PR comment using `GITHUB_TOKEN` when that token has permission to comment.
- Stops the previous active preview before starting a new deployment for the same PR. Live previews receive a two-hour expiry and a periodic cleanup task.

### Deployment / Orchestration

The deployment service creates a `BUILDING` record and starts the preview pipeline asynchronously. The preview service checks out source, chooses a Dockerfile, builds the image, starts a container, saves the resulting URL/status, and records failures. Closing a PR stops active preview containers and marks deployments `CLOSED` or `MERGED`.

### Backend Server

Express 5 serves authentication, repository, deployment, preview, and webhook APIs on port `5000`. Prisma Client with the PostgreSQL adapter persists application state.

### Database

PostgreSQL stores users, connected repositories and webhook settings, pull requests, deployment history, and baseline deployment metadata. Prisma schema and migrations are under `server/prisma/`. **The checked-in initial SQL migration is older than the current Prisma schema**: it does not create the current `User` model or several later fields. For a fresh local database, use `prisma db push` as shown below; do not expect `migrate deploy` alone to produce the current schema.

### Frontend

The React 19, TypeScript, and Vite dashboard supports GitHub sign-in, repository connection, PR/status filtering, preview and baseline controls, and log viewing. The Vite development server on port `3000` proxies `/api` requests to the backend.

## System Architecture

```mermaid
flowchart LR
  Dev[Developer] --> GH[GitHub Pull Request]
  GH -->|pull_request webhook| WH[POST /api/webhooks/github]
  WH --> BE[Express Backend :5000]
  FE[React / Vite Frontend :3000] <-->|REST API| BE
  BE --> AUTH[GitHub OAuth / Octokit]
  BE --> RS[Repository and Webhook Service]
  BE --> DS[Deployment Service]
  DS --> PS[Preview Service]
  PS --> GS[Git clone at commit]
  PS --> Docker[Docker Engine]
  Docker --> PE[Preview container]
  PE --> URL[http://localhost:<allocated-port>]
  BE <--> DB[(PostgreSQL via Prisma)]
  PS -->|optional PR comment| GH
```

## How BranchVerse Works

1. A developer opens a pull request or pushes another commit to it.
2. GitHub sends the repository's `pull_request` webhook to BranchVerse.
3. The webhook handler checks the event type, optionally verifies the signature, and updates the repository and PR records.
4. For `opened` and `synchronize`, BranchVerse stops active previews for that PR, creates a `BUILDING` deployment record, and runs deployment work in the background.
5. The preview service clones the PR branch and checks out the event's commit SHA. It locates the app directory, then uses the repository Dockerfile or a server template.
6. Docker builds an image and starts a container. Docker selects a host port for the container's exposed application port.
7. BranchVerse stores the preview URL (`http://localhost:<host-port>`), container details, logs, and a two-hour expiry. It attempts to comment the URL on the PR.
8. The dashboard polls the PR list every four seconds and displays the latest deployment data.
9. On `closed`, BranchVerse stops active containers for the PR and marks deployments `MERGED` if GitHub says it was merged, otherwise `CLOSED`.

## GitHub Integration

Sign-in uses GitHub OAuth. The app requests `repo`, `admin:repo_hook`, and `user:email` scopes, exchanges the callback code for an access token, fetches the GitHub profile, stores the user/token, and redirects to the frontend with a JWT query parameter. The frontend saves that JWT in `localStorage` and sends it as a Bearer token.

Repository connection uses the user's OAuth token (or `GITHUB_TOKEN`) to register a webhook and inspect repository metadata. When a repository is connected, BranchVerse creates a random webhook secret and saves it with the repository. If GitHub rejects webhook creation for access/permission reasons, the service logs a warning and the hook must be added manually. GitHub webhook registration subscribes to `pull_request` events. The current API does not return the generated secret; when configuring a manual hook, leave the GitHub secret blank so GitHub does not send a signature that cannot match the stored secret.

Deployment cloning uses the connected user's stored token for private repositories, with `GITHUB_TOKEN` as fallback. The post-deploy PR comment specifically uses `GITHUB_TOKEN`; the token must be able to write PR comments for this optional step to work.

## Webhooks

**GitHub event → endpoint → event processing → deployment or cleanup**

The endpoint is `POST /api/webhooks/github`. It expects GitHub's JSON pull-request payload and the `X-GitHub-Event: pull_request` header. Fields used include `action`, `number`, `repository.full_name`, and `pull_request.title`, `.user.login`, `.head.ref`, `.head.sha`, and `.merged` when closed. A local payload can be sent to this endpoint for development; the frontend has a helper that simulates the supported actions.

| Action | Implemented behavior |
|---|---|
| `opened` | Upserts PR metadata and starts a deployment for its head SHA. |
| `synchronize` | Updates PR metadata and replaces the active preview with a deployment for the new head SHA. |
| `closed` | Stops active previews; marks the PR and its deployments `MERGED` or `CLOSED` based on `pull_request.merged`. |
| Other action/event | The event processor does nothing. |

The handler returns `200` with `{ "message": "Webhook received" }` and invokes event processing without awaiting it. Signature validation occurs only when `X-Hub-Signature-256` is supplied and a secret is found for the payload repository; deliveries without a signature are accepted. Configure the GitHub webhook content type as JSON and subscribe to Pull requests.

## Preview Environment

A Preview Environment is the app built from a specific PR commit and run in a Docker container. The deployment records the commit SHA and container metadata. The service builds in a temporary checkout under `server/workspaces/<deployment-id>` and removes that checkout when the preview is destroyed. Docker port bindings request an automatically assigned host port. Node-style apps use port `3000`; static apps use port `80`. A repository-provided Dockerfile is used as supplied.

The generated URL is `http://localhost:<host-port>`. This address is local to the backend/Docker host, not a public hostname; `PUBLIC_URL` configures the incoming GitHub webhook endpoint and does not change preview URLs. On a PR update, the previous active deployment is stopped and marked `SUPERSEDED`; on PR close it is stopped and marked closed/merged. On manual destruction, the deployment becomes `CLOSED`. Live deployment expiry is set to two hours, and a cleanup loop checks every 15 minutes.

Directory detection recognizes Dockerfile, `package.json`, Python markers (`requirements.txt` / `pyproject.toml`), Go (`go.mod`), or `index.html`. The checked-in templates are `Dockerfile.preview` (Node), `Dockerfile.node`, and `Dockerfile.static`; there are no Python or Go templates. Use a repository Dockerfile for those runtimes. The default Node template expects a runnable Node app and exposes port 3000.

## Deployment / Orchestration

1. **GitHub service / repository service:** Octokit supports repository lookup and webhook registration. The webhook payload itself supplies PR information for deployment.
2. **Webhook service:** Upserts repository and PR metadata, then routes the supported action to deployment or preview cleanup.
3. **Deployment service:** Stops active previews for the PR, creates a deployment row, and schedules preview work without blocking the webhook response.
4. **Git service:** Clones the branch into a per-deployment workspace and checks out the exact commit SHA.
5. **Preview service:** Chooses the app directory and Dockerfile, incorporates configured install/build commands for generated templates, builds the image, starts the container, resolves its mapped host port, and persists deployment state.
6. **Docker service:** Uses Dockerode and the local Docker Engine for image builds, container creation/start, port inspection, log retrieval, and stop/removal.
7. **Database:** Prisma records PR, repository, and deployment state for the dashboard and API.

The optional baseline deployment uses the default branch and repository-level baseline fields. It is started through a repository API call and has a status check; it is separate from per-PR preview lifecycle handling.

## Backend Server

The backend is TypeScript on Express 5. `server/src/server.ts` installs CORS, JSON parsing, and optional JWT authentication, mounts the API routers, listens on `5000`, and starts the 15-minute expired-deployment cleanup interval. Controllers validate/shape HTTP requests and responses; services perform GitHub, Git, Docker, Prisma, and deployment work.

JWT authentication is optional globally: routes using `requireAuth` reject unauthenticated requests; other routes may continue without a user. See the API table for each route. Sessions last seven days.

## API Reference

All paths below are relative to `/api`. JSON bodies are used where applicable. Unless marked otherwise, the route does not install `requireAuth` (although a valid bearer JWT is loaded by global middleware).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/auth/github` | Return `{ url }`, the GitHub OAuth authorization URL. |
| GET | `/auth/github/callback` | OAuth callback; accepts `?code=...`, stores/updates user, redirects to `CLIENT_URL?token=...`. |
| GET | `/auth/me` | Return `{ user }` for the current session, or null/401. |
| GET | `/auth/user-repos` | List up to 50 repositories for the current GitHub user. |
| POST | `/webhooks/github` | Receive a GitHub webhook. Requires pull-request event JSON and `X-GitHub-Event`; signature header is optionally checked. |
| GET | `/deployments` | List the current user's PRs with repository and up to ten recent deployments; empty list if no user. |
| GET | `/deployments/:pullRequestId` | Return a PR with its repository and deployments. |
| GET | `/deployments/:pullRequestId/logs/:deploymentId` | Return stored build logs, available live container logs, and error message. `pullRequestId` is present in the URL but the handler looks up by deployment ID. |
| POST | `/previews/:pullRequestId/redeploy` | Start a new deployment for the PR's latest recorded commit. Returns `201` and deployment record. |
| POST | `/previews/:deploymentId/destroy` | Stop/remove a deployment's container and mark it `CLOSED`. |
| DELETE | `/previews/:deploymentId` | Same destroy handler as the POST route. |
| GET | `/previews/:deploymentId/status` | Return status, URL, host port, container ID, timestamps, and PR summary. |
| GET | `/repos` | **Auth required.** List connected repositories for the user. |
| POST | `/repos/connect` | **Auth required.** Connect a repo; body: `repositoryFullName` (required), optional `appDirectory`, `buildCommand`, `installCommand`, `productionUrl`. Returns repository and webhook details. |
| POST | `/repos/inspect` | Inspect repository app type/path. Body: `repositoryFullName` (required), optional `appDirectory`. |
| DELETE | `/repos/:repositoryId/disconnect` | **Auth required.** Delete the GitHub webhook if possible and delete the repository record. |
| POST | `/repos/:repositoryId/deploy-baseline` | **Auth required.** Start a default-branch baseline deployment; responds `202`. |
| GET | `/repos/:repositoryId/baseline-status` | **Auth required.** Return baseline status, URL, container ID, and port. |

Authentication uses `Authorization: Bearer <JWT>`. `POST /repos/inspect`, deployment detail/logs, and preview actions do not currently enforce `requireAuth`; do not expose this API publicly without adding suitable authorization checks.

## Database

BranchVerse uses PostgreSQL through Prisma 7 and `@prisma/adapter-pg`. `DATABASE_URL` is read by Prisma config and the runtime adapter. The current Prisma schema is the source for the application's expected tables. The checked-in initial migration is stale relative to that schema, so reconcile migrations before using migration-based provisioning in a shared/production database.

| Model | Purpose |
|---|---|
| `User` | GitHub identity, profile fields, stored OAuth access token, and connected repositories. |
| `Repository` | GitHub full name, build configuration, webhook ID/secret, owning user, and baseline deployment metadata. |
| `PullRequest` | PR number/title/author/branch/head commit/state and close time. Unique per repository and PR number. |
| `Deployment` | Commit, status, preview URL, Docker container/host port, build logs/error, and expiry. |

`Repository` has many pull requests; a `PullRequest` has many deployments. Deleting a repository cascades to PRs and deployments; user deletion sets repository ownership to null. The deployment status enum includes `BUILDING`, `DEPLOYING`, `LIVE`, `BUILD_FAILED`, `CLOSED`, `MERGED`, `EXPIRED`, and `SUPERSEDED`.

```mermaid
erDiagram
  USER ||--o{ REPOSITORY : owns
  REPOSITORY ||--o{ PULL_REQUEST : tracks
  PULL_REQUEST ||--o{ DEPLOYMENT : has
  USER {
    string id PK
    string githubId UK
    string username
    string accessToken
  }
  REPOSITORY {
    string id PK
    string fullName UK
    string userId FK
    string webhookSecret
    string baselineUrl
  }
  PULL_REQUEST {
    string id PK
    string repositoryId FK
    int number
    string latestCommitSha
    string state
  }
  DEPLOYMENT {
    string id PK
    string pullRequestId FK
    string commitSha
    string status
    string previewUrl
    string containerId
    int hostPort
  }
```

## Containerization

The backend controls the local Docker Engine through Dockerode. For each PR deployment it builds a named image from the selected app directory, then creates and starts a container with an ephemeral host port bound to the app's internal port. Node previews use `3000`; static previews use `80`. Docker logs are fetched for deployments marked `LIVE`.

The server includes `server/docker/Dockerfile.preview`, `Dockerfile.node`, and `Dockerfile.static` as template inputs. A repository's own `Dockerfile` takes precedence. Stopping a preview removes its container and workspace; image removal is not part of that cleanup path. The baseline service runs a separate persistent container per repository, replacing an old baseline when redeployed; the repository does not expose a baseline destroy endpoint.

## Frontend

The client uses React 19, TypeScript, Vite 8, Tailwind CSS, and Axios. Its main dashboard includes:

- GitHub sign-in and account display.
- Connected repository management and configuration via `ConnectRepoModal`.
- PR cards, summary statistics, search, and status filters.
- Preview URL/status, redeploy and destroy controls, plus build/container log viewer.
- Baseline deployment/status and split preview comparison UI.

Axios calls `/api` and attaches the stored JWT. The dashboard refreshes PR data every four seconds. In development Vite proxies `/api` to `http://localhost:5000`.

## Project Structure

```text
BranchVerse/
├── client/
│   ├── src/
│   │   ├── components/       # Dashboard, deployment, layout, and UI components
│   │   ├── pages/            # DashboardPage
│   │   ├── services/api.ts   # Axios API client and API helpers
│   │   └── types/            # Frontend data contracts
│   ├── package.json
│   └── vite.config.ts
└── server/
    ├── docker/               # Preview Dockerfile templates
    ├── prisma/
    │   ├── schema.prisma      # Models and enums
    │   └── migrations/        # PostgreSQL migration history
    ├── src/
    │   ├── controllers/       # HTTP handlers
    │   ├── routes/            # Express route definitions
    │   ├── services/          # GitHub, Git, Docker, preview, deployment, repo logic
    │   ├── middlewares/       # JWT session loading and auth requirement
    │   ├── lib/prisma.ts      # Prisma/PostgreSQL adapter
    │   ├── types/             # Webhook and deployment types
    │   └── server.ts          # Express app and scheduled cleanup
    ├── package.json
    └── prisma.config.ts
```

`server/workspaces/` is generated at runtime for repository checkouts and is gitignored. Prisma-generated client code is under `server/src/generated/prisma/`.

## Environment Variables

Create `server/.env`; this repository does not include an environment template. Do not commit credentials. These names are read by the current source:

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string for Prisma runtime and CLI. |
| `GITHUB_CLIENT_ID` | Yes for OAuth | GitHub OAuth App client ID. |
| `GITHUB_CLIENT_SECRET` | Yes for OAuth callback | GitHub OAuth App client secret. |
| `OAUTH_CALLBACK_URL` | Optional | OAuth callback base URL; defaults to `http://localhost:5000`. Register its `/api/auth/github/callback` URL in the OAuth App. |
| `CLIENT_URL` | Optional | OAuth redirect target; defaults to `http://localhost:3000`. |
| `PUBLIC_URL` | Required to connect repos | Publicly reachable backend base URL used to register GitHub webhook delivery. For local development, use a tunnel URL. |
| `GITHUB_TOKEN` | Optional fallback | GitHub API and clone fallback token; used for the post-deploy PR comment. User OAuth tokens are used for repository-specific operations when available. |
| `JWT_SECRET` | Optional in code; set for real use | Secret for signing/verifying seven-day session JWTs. Source has a development fallback, so set a private value in `.env`. |

No `PORT` variable is supported by the current server; it listens on `5000`. Docker preview URLs are generated as `localhost` URLs and are not configurable through environment variables.

## Local Setup

### Prerequisites

- Node.js and npm compatible with the checked-in projects (the preview Node Dockerfile uses Node 20).
- PostgreSQL.
- Git available on the backend host.
- Docker Engine running and accessible to the backend process.
- A GitHub OAuth App; webhook-capable token permissions for automatic webhook registration.

1. Clone the repository and enter its root:

   ```bash
   git clone <repository-url>
   cd BranchVerse
   ```

2. Create a PostgreSQL database and set `DATABASE_URL` in `server/.env`.

3. Create a GitHub OAuth App. Set its callback URL to `http://localhost:5000/api/auth/github/callback` for local OAuth, then copy the client ID and secret into `server/.env`.

4. Create `server/.env` with the values described above. For local webhook delivery, set `PUBLIC_URL` to your active tunnel's HTTPS URL. `OAUTH_CALLBACK_URL` can remain localhost so OAuth does not need to pass through the tunnel.

   ```dotenv
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/branchverse?schema=public"
   GITHUB_CLIENT_ID="your-oauth-client-id"
   GITHUB_CLIENT_SECRET="your-oauth-client-secret"
   JWT_SECRET="replace-with-a-long-random-secret"
   OAUTH_CALLBACK_URL="http://localhost:5000"
   CLIENT_URL="http://localhost:3000"
   PUBLIC_URL="https://your-current-tunnel.example"
   GITHUB_TOKEN="your-token-if-needed"
   ```

5. Install backend dependencies, sync the fresh local database to the current schema, and generate the Prisma client:

   ```bash
   cd server
   npm install
   npx prisma db push
   npx prisma generate
   ```

   `server/prisma.config.ts` reads `DATABASE_URL`. The committed initial migration predates the current schema, so `migrate deploy` alone is not sufficient for a fresh setup.

6. Ensure Docker is running. The backend uses the Docker Engine available to Dockerode on the host; preview builds are initiated by the backend process.

7. Install frontend dependencies in a second terminal:

   ```bash
   cd client
   npm install
   ```

8. Start the backend and frontend in separate terminals:

   ```bash
   cd server
   npm run dev
   ```

   ```bash
   cd client
   npm run dev
   ```

9. Open `http://localhost:3000`, sign in with GitHub, and connect a repository. BranchVerse tries to register the webhook. If automatic registration fails, add a repository webhook manually at `<PUBLIC_URL>/api/webhooks/github`, choose JSON, and set the event to **Pull requests**. The API does not expose the generated secret, so leave the manual webhook secret blank; otherwise GitHub's signature will not match the stored secret. For local-only flow checks, use the dashboard's simulated webhook helper instead.

For an actual GitHub webhook, the tunnel must forward to backend port `5000`. Update `PUBLIC_URL` whenever the tunnel address changes and reconnect/update the GitHub webhook URL. OAuth uses `OAUTH_CALLBACK_URL`, not `PUBLIC_URL`.

## Running the Project

Run these processes from separate terminals:

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

The UI is at `http://localhost:3000`; the API is at `http://localhost:5000`. To receive GitHub events from outside your machine, run an HTTPS tunnel that forwards to port `5000` and configure its address in `PUBLIC_URL`. Preview containers themselves bind to the Docker host and BranchVerse returns `http://localhost:<port>`.

## Pull Request Lifecycle

```mermaid
sequenceDiagram
  actor Developer
  participant GitHub
  participant Webhook as BranchVerse Webhook
  participant Backend as Backend Services
  participant DB as PostgreSQL
  participant Docker
  Developer->>GitHub: Open PR / push commit
  GitHub->>Webhook: pull_request opened or synchronize
  Webhook->>DB: Upsert repository and PR
  Webhook->>Backend: Create deployment in background
  Backend->>Docker: Build image and start container
  Docker-->>Backend: Container ID and allocated host port
  Backend->>DB: Save LIVE status, URL, logs, expiry
  Backend->>GitHub: Comment with preview URL (if token permits)
  GitHub-->>Developer: PR comment with URL
  Developer->>GitHub: Close or merge PR
  GitHub->>Webhook: pull_request closed
  Webhook->>Docker: Stop and remove active preview container
  Webhook->>DB: Mark PR/deployments CLOSED or MERGED
```

- **PR creation:** `opened` creates/updates the PR record and starts a deployment.
- **PR update:** `synchronize` stores the new commit SHA, stops active containers, marks old active deployment records `SUPERSEDED`, and starts a replacement deployment.
- **PR merge/close:** `closed` destroys active previews; the `merged` payload flag determines `MERGED` versus `CLOSED` status.
- **Expiry/manual cleanup:** Live deployments are assigned a two-hour expiry. A backend timer checks expired live records every 15 minutes and removes their container/workspace. The preview API also provides manual destroy. Cleanup removes containers and workspace directories, but not built images.

## Troubleshooting

| Symptom | Checks |
|---|---|
| Docker daemon or socket error | Start Docker Engine and confirm the account running `npm run dev` can access it. Check Dockerode's default local connection. |
| PostgreSQL connection/authentication error | Verify PostgreSQL is running, database/user/password/port in `DATABASE_URL`, and that the database exists. |
| Prisma schema/client errors | From `server/`, confirm `.env` is present. For a fresh local database, run `npx prisma db push` and `npx prisma generate`; the initial migration is stale relative to the current schema. |
| GitHub OAuth fails | Verify `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and the exact OAuth callback URL. The callback defaults to `http://localhost:5000/api/auth/github/callback`. |
| Private repository clone fails | Confirm the logged-in GitHub account has repository access and the requested OAuth scopes. `GITHUB_TOKEN` is the fallback for cloning. |
| Webhook does not arrive | Confirm `PUBLIC_URL` is public HTTPS, the tunnel forwards to port `5000`, webhook URL ends in `/api/webhooks/github`, and GitHub subscribes to Pull requests. Inspect recent deliveries in GitHub. |
| Signature rejected | Verify the secret on the GitHub webhook matches the saved repository secret. The current connection API does not return the generated secret. |
| ngrok/tunnel URL changed | Update `PUBLIC_URL` and the GitHub webhook target. OAuth callback remains controlled by `OAUTH_CALLBACK_URL`. |
| Host port conflict/unreachable preview | Docker chooses the host port; check Docker container state and host firewall/networking. The URL uses `localhost` and is not a public URL. |
| Image build/container failure | Open deployment logs in the dashboard/API. Check app directory, app-specific build/install commands, Dockerfile, exposed/expected port, and whether the runtime matches the available templates. |

## Development Commands

| Area | Command (run from directory) | Purpose |
|---|---|---|
| Backend | `npm run dev` (`server/`) | Run Express with `tsx watch` on port 5000. |
| Backend | `npm run build` (`server/`) | Compile TypeScript to `server/dist`. |
| Backend | `npm start` (`server/`) | Run compiled server. |
| Frontend | `npm run dev` (`client/`) | Start Vite development server on port 3000. |
| Frontend | `npm run build` (`client/`) | Type-check/build the Vite app. |
| Frontend | `npm run preview` (`client/`) | Serve a built frontend locally for preview. |
| Frontend | `npm run lint` (`client/`) | Run Oxlint. |
| Prisma | `npx prisma db push` (`server/`) | Sync a local database to the current schema (the checked-in initial migration is stale). |
| Prisma | `npx prisma migrate deploy` (`server/`) | Apply committed migrations; reconcile the stale initial migration before relying on it for a clean current-schema database. |
| Prisma | `npx prisma generate` (`server/`) | Generate Prisma Client. |
| Docker | `docker ps -a` | Inspect containers created by preview deployments. |
