# Centralized Wiz CLI PR Vulnerability Scanning

This repository contains a reference implementation for centralized Wiz CLI scanning that is driven by a GitHub App webhook listener.

## Flow

1. A GitHub App receives `pull_request` webhook events (`opened`, `reopened`, `synchronize`, `ready_for_review`).
2. The webhook service dispatches a `repository_dispatch` event (`wiz-pr-scan`) to this repository.
3. The centralized workflow checks out the target PR commit and runs `wizcli` scan.
4. The workflow downloads the previous scan artifact for the same PR as a baseline.
5. A differential report is generated to identify newly introduced vulnerabilities.
6. The workflow uploads the latest scan as the next baseline and comments summary results on the target PR.

## Files

- `.github/workflows/wiz-centralized-pr-scan.yml`: central workflow that performs scan + differential logic.
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
