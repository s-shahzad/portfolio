# Portfolio Project

Local portfolio site with:

- Static frontend (`index.html`, `admin.html`, `cyber-demo.html`)
- Python API backend (`server.py`)
- Contact submission storage in SQLite
- Admin dashboard APIs

## Prerequisites

- Python 3.12+
- Node.js 24+
- Git

## Run Locally

```powershell
cd C:\Users\shaik\portfolio
.\start-server.ps1 -Port 8000
```

If script execution policy blocks `.ps1` files, run with bypass for this launch only:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-server.ps1 -Port 8000
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/admin.html`
- `http://127.0.0.1:8000/cyber-demo.html`

## Environment and Secrets

Copy `portfolio.env.local.ps1.example` to `portfolio.env.local.ps1` and set non-secret values.

For secrets, use Windows Credential Manager targets (loaded automatically by `start-server.ps1` and `scripts/run-server-service.ps1`):

- `portfolio/admin-token`
- `portfolio/admin-token-hash`
- `portfolio/smtp-password`

Examples:

```powershell
.\scripts\credential-manager.ps1 -SetTarget 'portfolio/admin-token-hash' -SetSecret '<pbkdf2 hash>'
.\scripts\credential-manager.ps1 -SetTarget 'portfolio/smtp-password' -SetSecret '<smtp password>'
```

## Admin Token Rotation (Hash-First)

Generate and optionally store a new token/hash pair:

```powershell
.\scripts\rotate-admin-token.ps1 -StoreInCredentialManager -UseHashOnly
```

Generate hash only (manual flow):

```powershell
python scripts\generate_admin_token_hash.py --json
```

`server.py` supports these admin modes:

- `localhost_only`
- `token`
- `token_hash`
- `token_required_not_configured`
- `token_hash_invalid`

## Validation Checks

```powershell
.\scripts\run-checks.ps1
```

This runs:

- Python compile check (`server.py`)
- JavaScript syntax checks (`script.js`, `chatbot-upgrade.js`)
- Static HTML sanity checks
- Accessibility/performance sanity checks
- API smoke tests
- Pytest integration tests

Install test deps if needed:

```powershell
python -m pip install -r requirements-dev.txt
```

## Deploy and Staging

Create `portfolio.env.staging.ps1` from `portfolio.env.staging.ps1.example`, then deploy staging:

```powershell
.\deploy-staging.ps1 -Port 8100
```

Production deploy entrypoint:

```powershell
.\deploy.ps1
```

Operational procedures are documented in `RUNBOOK.md`.

## Deploy to Render

This repo can be deployed as a long-running Python web service on Render without rewriting the app into serverless functions.

The repo now includes a Render blueprint file:

- `render.yaml`

Fastest path:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint or Web Service from the repo.
3. Let Render use the included `render.yaml`.
4. In Render, set these required secret environment variables before going live:

- `PORTFOLIO_ADMIN_TOKEN_HASH`
- `PORTFOLIO_SMTP_USERNAME`
- `PORTFOLIO_SMTP_PASSWORD`
- `PORTFOLIO_SMTP_FROM`
- `PORTFOLIO_SMTP_TO`

Recommended:

- Keep `PORTFOLIO_ADMIN_REQUIRE_TOKEN=true`
- Keep `PORTFOLIO_SMTP_PROVIDER=gmail` unless you intentionally switch providers
- Verify `/api/health` after deploy

Render start command is configured as:

```text
python server.py --host 0.0.0.0 --port $PORT
```

Important limitation:

- Contact submissions and admin audit logs are stored on the service filesystem by `server.py`.
- That works for initial deployment, but it is not durable storage on typical hosted instances.
- For production-grade persistence, move contact/admin storage to managed durable storage before relying on hosted restarts or rebuilds.

## Backup and Restore

Manual backup:

```powershell
.\scripts\backup-contact-db.ps1 -RetentionDays 30
```

Restore DB from backup:

```powershell
.\scripts\restore-contact-db.ps1 -BackupFile "backups\contact-db\messages-YYYYMMDD-HHMMSS.db" -TargetDb "contact_messages\messages.db" -Overwrite
```

Run backup/restore drill locally:

```powershell
python scripts\backup_restore_drill.py --source-db contact_messages\messages.db --backup-dir backups\restore-drill --restore-db backups\restore-drill\restore-check.db
```

## Monitoring and Alerting

Run one health check:

```powershell
.\scripts\check-health.ps1 -HealthUrl 'http://127.0.0.1:8000/api/health'
```

Optional webhook alerts use `PORTFOLIO_ALERT_WEBHOOK_URL`.

Register recurring monitor task (every 5 minutes):

```powershell
.\scripts\register-health-monitor-task.ps1 -TaskName 'PortfolioHealthMonitor' -IntervalMinutes 5
```

## GitHub Workflows

- `ci.yml`: quality checks with artifact upload (`artifacts/*.log`, pytest JUnit XML)
- `security.yml`: pip-audit, npm audit (if `package.json` exists), CodeQL
- `backup-restore-drill.yml`: monthly restore drill (`04:35 UTC`, day 1) + manual dispatch
- `release.yml`: tag-based release (`v*`) with generated release notes and optional deploy trigger
- `deploy.yml`: deploy workflow for self-hosted Windows runner
- `dependabot.yml`: weekly updates for GitHub Actions and pip

## Branch Protection

Automate GitHub branch protection for `main`:

```powershell
$env:GITHUB_TOKEN = '<repo-admin-token>'
.\scripts\apply-branch-protection.ps1 -Owner 's-shahzad' -Repo 'portfolio' -Branch 'main' -RequiredChecks checks
```

If branch protection is unavailable on your GitHub plan for a private repo, use:

- `.github/CODEOWNERS`
- `.github/pull_request_template.md`
- `.github/workflows/main-push-guard.yml`

## Security

Security guidance and reporting details are in `SECURITY.md`.
