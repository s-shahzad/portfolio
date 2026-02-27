# Portfolio Project

Local portfolio site with:

- Static frontend (`index.html`, `admin.html`, `cyber-demo.html`)
- Python API backend (`server.py`)
- Contact submission storage in SQLite
- Admin dashboard APIs

## Prerequisites

- Python 3.10+
- Node.js (for JavaScript syntax checks)
- Git

## Run Locally

```powershell
cd C:\Users\shaik\portfolio
.\start-server.ps1 -Port 8000
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/admin.html`
- `http://127.0.0.1:8000/cyber-demo.html`

## Local Environment Hardening

Copy `portfolio.env.local.ps1.example` to `portfolio.env.local.ps1`, then set values.

Minimum recommended settings for LAN/public access:

- `PORTFOLIO_ADMIN_TOKEN=<strong-random-token>`
- `PORTFOLIO_ADMIN_REQUIRE_TOKEN=true`
- `PORTFOLIO_ENABLE_HSTS=true` (only behind HTTPS)

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
- Pytest integration tests (if `tests/` exists)

Install test deps if needed:

```powershell
python -m pip install -r requirements-dev.txt
```

## Branch Protection

Automate GitHub branch protection for `main`:

```powershell
$env:GITHUB_TOKEN = '<repo-admin-token>'
.\scripts\apply-branch-protection.ps1 -Owner 's-shahzad' -Repo 'portfolio' -Branch 'main' -RequiredChecks checks
```

## HTTPS Fronting + Windows Service

1) Configure Caddy reverse proxy (HTTPS):

```powershell
.\scripts\setup-caddy.ps1 -Domain 'your-domain.example' -BackendHost '127.0.0.1' -BackendPort 8000 -InstallService
```

2) Install Python API as Windows service:

```powershell
.\scripts\install-portfolio-service.ps1 -ServiceName 'PortfolioPythonServer' -BindHost '127.0.0.1' -Port 8000 -StartNow
```

Remove service:

```powershell
.\scripts\uninstall-portfolio-service.ps1 -ServiceName 'PortfolioPythonServer'
```

## Automated Backups (Daily + Retention)

Manual backup:

```powershell
.\scripts\backup-contact-db.ps1 -RetentionDays 30
```

Register daily scheduled backup:

```powershell
.\scripts\register-backup-task.ps1 -TaskName 'PortfolioContactDbBackup' -DailyTime '02:00' -RetentionDays 30
```

Remove backup task:

```powershell
.\scripts\register-backup-task.ps1 -TaskName 'PortfolioContactDbBackup' -Remove
```

## Monitoring + Alerting

Run one health check:

```powershell
.\scripts\check-health.ps1 -HealthUrl 'http://127.0.0.1:8000/api/health'
```

Optional webhook alerts: set `PORTFOLIO_ALERT_WEBHOOK_URL`.

Register recurring monitor task (every 5 minutes):

```powershell
.\scripts\register-health-monitor-task.ps1 -TaskName 'PortfolioHealthMonitor' -IntervalMinutes 5
```

Remove monitor task:

```powershell
.\scripts\register-health-monitor-task.ps1 -TaskName 'PortfolioHealthMonitor' -Remove
```

## GitHub Workflows

- `ci.yml`: compile/syntax/static/a11y/smoke/pytest checks
- `security.yml`: pip-audit, npm audit (if `package.json` exists), CodeQL
- `release.yml`: tag-based release (`v*`) with generated release notes and optional deploy trigger
- `deploy.yml`: deploy workflow for self-hosted Windows runner

## Release Flow

Create and push a version tag:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

This triggers `release.yml`. If `REPO_DISPATCH_TOKEN` is configured in GitHub secrets, it also dispatches `deploy.yml`.

## Security

Security guidance and reporting details are in `SECURITY.md`.
