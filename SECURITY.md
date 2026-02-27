# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, email:
shaikazhadshahzad@gmail.com

Target response time: 48 hours.

## Current Security Controls

- Contact API input-size limits and JSON validation.
- Optional SMTP auth with provider presets and safe defaults.
- Honeypot + rate limiting on contact submissions.
- Admin authentication modes:
  - `localhost_only` (default)
  - `token` (when `PORTFOLIO_ADMIN_TOKEN` is configured)
  - `token_hash` (when `PORTFOLIO_ADMIN_TOKEN_HASH` is configured)
  - `token_required_not_configured` (safe-fail when auth is required but missing)
  - `token_hash_invalid` (safe-fail when hash format is invalid)
- Admin session cookie hardening: `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS.
- Admin audit logging to `logs/admin_audit.jsonl` for login/logout/auth decisions.
- Security headers by default:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Content-Security-Policy` on HTML responses
- Optional `Strict-Transport-Security` when HTTPS + `PORTFOLIO_ENABLE_HSTS=true`.

## Secret Management

Prefer Windows Credential Manager over plaintext `.env` values for sensitive material.

Supported targets:

- `portfolio/admin-token`
- `portfolio/admin-token-hash`
- `portfolio/smtp-password`

Helper script:

```powershell
.\scripts\credential-manager.ps1 -SetTarget '<target>' -SetSecret '<secret>'
.\scripts\credential-manager.ps1 -GetTarget '<target>'
.\scripts\credential-manager.ps1 -RemoveTarget '<target>'
```

Admin token rotation helper:

```powershell
.\scripts\rotate-admin-token.ps1 -StoreInCredentialManager -UseHashOnly
```

## Repository and CI Safeguards

- CI gate: `.github/workflows/ci.yml` (uploads build/test logs as artifacts)
- Security scans: `.github/workflows/security.yml`
- Monthly restore drill: `.github/workflows/backup-restore-drill.yml`
- Automated dependency updates: `.github/dependabot.yml`
- Optional branch protection automation: `scripts/apply-branch-protection.ps1`
- Release/deploy chain: `.github/workflows/release.yml`, `.github/workflows/deploy.yml`

## Recommended Deployment Settings

For LAN/public deployment, use these minimum settings:

- `PORTFOLIO_ADMIN_REQUIRE_TOKEN=true`
- `PORTFOLIO_ADMIN_TOKEN_HASH=<pbkdf2_sha256$...>`
- `PORTFOLIO_ENABLE_HSTS=true` (only when TLS/HTTPS is active)
- `PORTFOLIO_STATIC_CACHE_MAX_AGE_SECONDS=604800`

## Operational Hardening

- Run Python API behind HTTPS reverse proxy (`scripts/setup-caddy.ps1`).
- Run API as a Windows service (`scripts/install-portfolio-service.ps1`).
- Configure daily DB backups (`scripts/register-backup-task.ps1`).
- Validate restore path regularly (`scripts/backup_restore_drill.py`).
- Keep incident/rollback procedures in `RUNBOOK.md`.

## Verification

Run local checks before publishing:

```powershell
.\scripts\run-checks.ps1
```
