import type { Request, Response } from "express";
import { processWebhook } from "../services/webhook.service.js";

export const handleWebhook = (req: Request, res: Response) => {
    const event = req.headers["x-github-event"];

    console.log(event);

    processWebhook(event as string, req.body);

    res.status(200).json({
        message: "Webhook received"
    });
};

