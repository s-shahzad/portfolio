# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, email:
shaikazhadshahzad@gmail.com

Target response time: 48 hours.

## Current Security Controls

- Contact API input-size limits and JSON validation.
- Optional SMTP auth with provider presets and safe defaults.
- Honeypot + rate limiting on contact submissions.
- Admin modes:
  - `localhost_only` (default)
  - `token` (when `PORTFOLIO_ADMIN_TOKEN` is set)
  - `token_required_not_configured` (safe-fail when token is required but missing)
- Security headers added by default:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Content-Security-Policy` on HTML responses
- Optional `Strict-Transport-Security` (when HTTPS + `PORTFOLIO_ENABLE_HSTS=true`).
- Session cookie hardened with `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS.

## Recommended Deployment Settings

For LAN/public deployment, use these minimum environment settings:

- `PORTFOLIO_ADMIN_TOKEN=<strong-random-value>`
- `PORTFOLIO_ADMIN_REQUIRE_TOKEN=true`
- `PORTFOLIO_ENABLE_HSTS=true` (only when TLS/HTTPS is active)
- `PORTFOLIO_STATIC_CACHE_MAX_AGE_SECONDS=604800`

## Verification

Run local checks before publishing:

```powershell
.\scripts\run-checks.ps1
```
