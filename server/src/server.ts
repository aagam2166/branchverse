import express from "express";
import webhookRouter from "./routes/webhook.routes.js";

const app = express();

app.use(express.json());

app.use("/api/webhooks", webhookRouter);

app.listen(5000, () => {
  console.log("BranchVerse server running on port 5000");
});