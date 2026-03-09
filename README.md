# Centralized Wiz CLI PR Vulnerability Scanning

This repository contains a reference implementation for centralized Wiz CLI scanning driven by GitHub App webhook events.

## Should this be split into multiple workflows?

Yes. Splitting improves separation of concerns and makes maintenance easier:

- `webhook-listener.yml`: routes incoming `repository_dispatch` events to the correct scan workflow.
- `wiz-scan.yml`: PR source scan + baseline/differential logic.
- `vm-scan.yml`: VM-specific scan path (independent lifecycle).

## Flow

1. A GitHub App receives pull request webhook events (`opened`, `reopened`, `synchronize`, `ready_for_review`).
2. The webhook service dispatches `repository_dispatch` (`wiz-pr-scan`) to this repository.
3. `webhook-listener.yml` routes to `wiz-scan.yml`.
4. `wiz-scan.yml` checks out the target PR commit, runs `wizcli`, downloads baseline, and computes differential results.
5. The latest scan is uploaded as the next baseline and a summary comment is posted to the target PR.

## Files

- `.github/workflows/webhook-listener.yml`: event router for `wiz-pr-scan` and `wiz-vm-scan`.
- `.github/workflows/wiz-scan.yml`: reusable workflow for PR code scanning and diff.
- `.github/workflows/vm-scan.yml`: reusable workflow for VM-oriented scan orchestration.
- `app/github-webhook-dispatcher.mjs`: webhook listener that dispatches `wiz-pr-scan` events.
- `scripts/diff_wiz_results.py`: compares baseline and current scan JSON outputs.

## Required Secrets

In this repository:

- `WIZ_CLIENT_ID`
- `WIZ_CLIENT_SECRET`
- `CENTRAL_CHECKOUT_TOKEN` (PAT or GitHub App installation token with target repo read + PR comment permissions)

In the webhook service runtime:

- `APP_WEBHOOK_SECRET`
- `DISPATCH_TOKEN` (token allowed to call `repository_dispatch` on this repo)
- `CENTRAL_WORKFLOW_REPO` (format: `owner/repo`)

## Run webhook listener locally

```bash
npm install express @octokit/rest
node app/github-webhook-dispatcher.mjs
```

Expose `/webhook` through your preferred tunneling tool and configure the GitHub App webhook URL accordingly.
