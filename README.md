# Portfolio Project

Local portfolio site with:

- Static frontend (`index.html`, `admin.html`, `cyber-demo.html`)
- Python API backend (`server.py`)
- Contact submission storage in SQLite
- Admin dashboard APIs

## Prerequisites

- Python 3.10+
- Node.js (for JS syntax checks)

## Run Locally

```powershell
cd C:\Users\shaik\portfolio
.\start-server.ps1 -Port 8000
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/admin.html`
- `http://127.0.0.1:8000/cyber-demo.html`

## Optional Local Env Config

Copy `portfolio.env.local.ps1.example` to `portfolio.env.local.ps1`, then set real values.

## Validation Checks

```powershell
.\scripts\run-checks.ps1
```

This runs:

- Python compile check (`server.py`)
- JavaScript syntax checks (`script.js`, `chatbot-upgrade.js`)
- Static HTML sanity checks
- API smoke tests against a temporary local server

## Security

Security guidance and reporting details are in `SECURITY.md`.
