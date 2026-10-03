import "dotenv/config";
import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.routes.js";
import deploymentRouter from "./routes/deployment.routes.js";
import previewRouter from "./routes/preview.routes.js";
import repoRouter from "./routes/repo.routes.js";
import authRouter from "./routes/auth.routes.js";
import { authenticateUser } from "./middlewares/auth.middleware.js";
import { cleanupExpiredDeployments } from "./services/deployment.service.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(authenticateUser);

app.use("/api/auth", authRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/deployments", deploymentRouter);
app.use("/api/previews", previewRouter);
app.use("/api/repos", repoRouter);

app.listen(5000, () => {
  console.log("BranchVerse server running on port 5000");
  
  // Run deployment expiry cleanup every 15 minutes
  setInterval(() => {
    cleanupExpiredDeployments().catch(err => {
      console.error("Error during deployment expiry cleanup:", err);
    });
  }, 15 * 60 * 1000);
});