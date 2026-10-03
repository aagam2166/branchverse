import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "branchverse_jwt_super_secret_key_2026";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        githubId: string;
        username: string;
        email?: string | null;
        avatarUrl?: string | null;
        accessToken: string;
    };
}

export const authenticateUser = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        let token: string | undefined;

        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.query.token && typeof req.query.token === "string") {
            token = req.query.token;
        }

        if (!token) {
            next();
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await (prisma as any).user.findUnique({
            where: { id: decoded.userId },
        });

        if (user) {
            req.user = user;
        }
    } catch (err) {
        console.warn("Auth token validation failed:", err);
    }
    next();
};

export const requireAuth = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({ error: "Authentication required. Please log in with GitHub." });
        return;
    }
    next();
};
