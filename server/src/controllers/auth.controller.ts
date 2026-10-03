import type { Request, Response } from "express";
import { Octokit } from "@octokit/rest";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import type { AuthRequest } from "../middlewares/auth.middleware.js";

const JWT_SECRET = process.env.JWT_SECRET || "branchverse_jwt_super_secret_key_2026";

export const getGitHubAuthUrl = (req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    if (!clientId) {
        res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured in server .env" });
        return;
    }

    // Use a dedicated OAuth callback URL (localhost) to avoid ngrok interstitial page
    // breaking the OAuth code exchange. PUBLIC_URL stays as ngrok for webhooks.
    const oauthCallbackBase = process.env.OAUTH_CALLBACK_URL?.trim() || "http://localhost:5000";
    const redirectUri = `${oauthCallbackBase}/api/auth/github/callback`;
    const scope = "repo admin:repo_hook user:email";

    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&prompt=select_account`;

    res.json({ url: githubUrl });
};

export const handleGitHubCallback = async (req: Request, res: Response) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== "string") {
            res.status(400).send("Authorization code missing from GitHub OAuth callback.");
            return;
        }

        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            res.status(500).send("GitHub OAuth Client ID or Client Secret missing in server environment.");
            return;
        }

        // 1. Exchange code for GitHub access token
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });

        const tokenData = (await tokenResponse.json()) as any;
        if (!tokenData.access_token) {
            console.error("Failed to fetch access token from GitHub:", tokenData);
            res.status(400).send(`GitHub OAuth error: ${tokenData.error_description || "Invalid code"}`);
            return;
        }

        const accessToken = tokenData.access_token;

        // 2. Fetch GitHub user profile
        const octokit = new Octokit({ auth: accessToken });
        const { data: ghUser } = await octokit.users.getAuthenticated();

        // 3. Upsert user in database
        const user = await (prisma as any).user.upsert({
            where: { githubId: String(ghUser.id) },
            update: {
                username: ghUser.login,
                email: ghUser.email || null,
                avatarUrl: ghUser.avatar_url || null,
                accessToken: accessToken,
            },
            create: {
                githubId: String(ghUser.id),
                username: ghUser.login,
                email: ghUser.email || null,
                avatarUrl: ghUser.avatar_url || null,
                accessToken: accessToken,
            },
        });

        // 4. Create JWT token for user session
        const sessionToken = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 5. Redirect back to client app frontend
        const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
        res.redirect(`${clientUrl}?token=${sessionToken}`);
    } catch (err: any) {
        console.error("GitHub OAuth Callback error:", err);
        res.status(500).send(`Authentication error: ${err.message}`);
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    if (!req.user) {
        res.status(401).json({ user: null });
        return;
    }

    const { id, username, email, avatarUrl } = req.user;
    res.json({
        user: { id, username, email, avatarUrl },
    });
};

export const getUserRepos = async (req: AuthRequest, res: Response) => {
    try {
        const token = req.user?.accessToken || process.env.GITHUB_TOKEN;
        if (!token) {
            res.status(401).json({ error: "No GitHub token available. Please log in with GitHub." });
            return;
        }

        const octokit = new Octokit({ auth: token });
        const { data: repos } = await octokit.repos.listForAuthenticatedUser({
            sort: "updated",
            per_page: 50,
        });

        const formatted = repos.map((r) => ({
            id: r.id,
            fullName: r.full_name,
            name: r.name,
            private: r.private,
            defaultBranch: r.default_branch,
            htmlUrl: r.html_url,
        }));

        res.json({ repositories: formatted });
    } catch (err: any) {
        console.error("Failed to fetch user repositories from GitHub:", err);
        res.status(500).json({ error: err.message || "Failed to fetch repositories" });
    }
};
