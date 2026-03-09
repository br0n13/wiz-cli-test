import express from "express";
import crypto from "node:crypto";
import { Octokit } from "@octokit/rest";

const {
  APP_WEBHOOK_SECRET,
  DISPATCH_TOKEN,
  CENTRAL_WORKFLOW_REPO,
  PORT = "3000",
} = process.env;

if (!APP_WEBHOOK_SECRET || !DISPATCH_TOKEN || !CENTRAL_WORKFLOW_REPO) {
  throw new Error(
    "Missing APP_WEBHOOK_SECRET, DISPATCH_TOKEN, or CENTRAL_WORKFLOW_REPO environment variable.",
  );
}

const [centralOwner, centralRepo] = CENTRAL_WORKFLOW_REPO.split("/");
const octokit = new Octokit({ auth: DISPATCH_TOKEN });
const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

function validateSignature(req) {
  const signature = req.get("x-hub-signature-256");
  if (!signature?.startsWith("sha256=")) return false;

  const digest = crypto
    .createHmac("sha256", APP_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", ""), "utf8"),
    Buffer.from(digest, "utf8"),
  );
}

app.post("/webhook", async (req, res) => {
  if (!validateSignature(req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const event = req.get("x-github-event");
  const action = req.body?.action;

  if (event !== "pull_request") {
    return res.status(202).json({ ignored: true, reason: "Not a pull_request event" });
  }

  const allowedActions = new Set(["opened", "reopened", "synchronize", "ready_for_review"]);
  if (!allowedActions.has(action)) {
    return res.status(202).json({ ignored: true, reason: `Action ${action} not handled` });
  }

  const pr = req.body.pull_request;
  const repository = req.body.repository;

  await octokit.repos.createDispatchEvent({
    owner: centralOwner,
    repo: centralRepo,
    event_type: "wiz-pr-scan",
    client_payload: {
      target_owner: repository.owner.login,
      target_repo: repository.name,
      pr_number: pr.number,
      head_sha: pr.head.sha,
      base_sha: pr.base.sha,
      head_ref: pr.head.ref,
      base_ref: pr.base.ref,
      html_url: pr.html_url,
    },
  });

  return res.status(202).json({ accepted: true });
});

app.listen(Number(PORT), () => {
  console.log(`Webhook listener running on :${PORT}`);
});
