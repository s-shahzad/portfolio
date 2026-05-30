# Azhad Shahzad Shaik — Portfolio

Detection-engineering and applied-ML portfolio. Live site, hybrid NIDS case study, a detection-as-code library, and IEEE-published research.

**Live:** https://azhadshahzadshaik.netlify.app

---

## What's here

- **Universal NIDS** — a hybrid network intrusion-detection system: Suricata + Zeek telemetry feeding a CatBoost classifier with a signature → supervised-ML → unsupervised-ML → weighted-fusion pipeline. Built for reproducibility (87k flows, 6-hour soak, validated replay). See `case-studies/`.
- **Detection-as-code** — rule library across `detections/`: Sigma, Splunk SPL, Suricata, and Zeek.
- **Research** — IEEE GCAIoT 2025 (first author, ML-based IoT intrusion detection) and JIST 2022 (IoT remote health monitoring).
- **Site** — static frontend (`index.html`, `styles.css`, `script.js`, `assets/`) with an optional Python API backend (`src/server.py`) for contact submissions.

## Tech

- Frontend: vanilla HTML/CSS/JS, Swiper, deployed on Netlify (`netlify.toml`).
- Backend (optional): Python 3.12 (`src/server.py`), SQLite contact storage.
- ML/detection: CatBoost, Suricata, Zeek, Sigma, Splunk SPL.

## Repo layout

```
index.html, styles.css, script.js   # live site
assets/                              # images, screenshots
case-studies/                        # NIDS write-up
detections/                          # sigma · splunk · suricata · zeek
projects/                            # project pages
src/                                 # Python API backend + tests
scripts/                             # build, checks, ops helpers
```

## Run locally

```bash
# static site only — any static server
python -m http.server 8000

# with the API backend
python src/server.py --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/`.

## Operations & security

- Operational procedures (deploy, backup/restore, monitoring, token rotation): `RUNBOOK.md`.
- Secrets are loaded from the OS secret store at runtime — none are committed. Reporting and security guidance: `SECURITY.md`.
