import type { Request, Response } from "express";
import crypto from "crypto";
import { processWebhook } from "../services/webhook.service.js";
import { prisma } from "../lib/prisma.js";

export const handleWebhook = async (req: Request, res: Response) => {
    const event = req.headers["x-github-event"] as string;
    const signature = req.headers["x-hub-signature-256"] as string | undefined;
    const payload = req.body;

    console.log(event);

    // Verify webhook signature if we have one stored for this repo
    if (signature && payload?.repository?.full_name) {
        const repoFullName = payload.repository.full_name as string;
        const repo = await (prisma as any).repository.findUnique({
            where: { fullName: repoFullName },
            select: { webhookSecret: true },
        });

        if (repo?.webhookSecret) {
            const rawBody = JSON.stringify(payload);
            const expected = "sha256=" + crypto
                .createHmac("sha256", repo.webhookSecret)
                .update(rawBody)
                .digest("hex");

            if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
                res.status(401).json({ error: "Invalid webhook signature" });
                return;
            }
        }
    }

    processWebhook(event, payload);

    res.status(200).json({ message: "Webhook received" });
};
