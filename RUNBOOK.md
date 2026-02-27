# Incident Runbook

## Scope

This runbook covers outage response, token rotation, service restart, and rollback for the portfolio stack.

## Services

- Python API service: `PortfolioPythonServer`
- HTTPS proxy service: `PortfolioCaddyProxy`
- Health endpoint: `https://localhost/api/health`

## 1) Outage Triage

1. Check services:

```powershell
sc.exe query PortfolioPythonServer
sc.exe query PortfolioCaddyProxy
```

2. Check health:

```powershell
curl.exe -k -s -o NUL -w "%{http_code}" https://localhost/api/health
```

3. Review logs:

```powershell
Get-Content .\logs\service\stderr.log -Tail 100
Get-Content .\logs\caddy-service\stderr.log -Tail 100
Get-Content .\logs\monitor\health-monitor.log -Tail 100
```

## 2) Token Rotation (Hash + Credential Manager)

1. Generate and store new token/hash:

```powershell
.\scripts\rotate-admin-token.ps1 -StoreInCredentialManager -UseHashOnly
```

2. Restart Python service:

```powershell
sc.exe stop PortfolioPythonServer
sc.exe start PortfolioPythonServer
```

3. Verify login works with new token.

## 3) Service Restart

```powershell
sc.exe stop PortfolioPythonServer
sc.exe stop PortfolioCaddyProxy
sc.exe start PortfolioPythonServer
sc.exe start PortfolioCaddyProxy
```

## 4) Rollback

1. List recent commits and pick target SHA:

```powershell
git log --oneline -20
```

2. Revert problematic commit(s):

```powershell
git revert <sha>
```

3. Push revert and redeploy.

## 5) Backup/Restore

- Run backup:

```powershell
.\scripts\backup-contact-db.ps1 -RetentionDays 30
```

- Restore from backup file:

```powershell
.\scripts\restore-contact-db.ps1 -BackupFile "backups\contact-db\messages-YYYYMMDD-HHMMSS.db" -TargetDb "contact_messages\messages.db" -Overwrite
```

## 6) Escalation Checklist

- Confirm whether impact is API-only or full site (HTTP + HTTPS).
- Capture failing timestamp + error text from logs.
- Record changes made during incident response.
- After recovery, run full checks:

```powershell
.\scripts\run-checks.ps1
```
