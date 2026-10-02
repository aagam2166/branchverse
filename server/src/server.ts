import express from "express";
import cors from "cors";
import webhookRouter from "./routes/webhook.routes.js";
import deploymentRouter from "./routes/deployment.routes.js";
import previewRouter from "./routes/preview.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/webhooks", webhookRouter);
app.use("/api/deployments", deploymentRouter);
app.use("/api/previews", previewRouter);

app.listen(5000, () => {
  console.log("BranchVerse server running on port 5000");
});