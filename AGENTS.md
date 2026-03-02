# Portfolio Agent Guide

## Project Scope
- This repo is a production-style personal portfolio for Azhad Shahzad Shaik.
- The public UI is static-first: `index.html`, `styles.css`, and `script.js`.
- The backend is a local Python service in `server.py` for health checks, contact capture, and admin APIs.

## Primary Goals
- Keep the portfolio polished, fast, and easy to maintain.
- Preserve the existing visual language unless a redesign is explicitly requested.
- Favor incremental improvements over broad rewrites.

## Frontend Rules
- Do not introduce React, build tooling, or framework dependencies unless explicitly requested.
- Keep navigation, accessibility, and responsive behavior intact.
- Preserve the security-minded setup already in place, including CSP, safe external links, and reduced-motion support.
- Keep the contact section focused on email and GitHub only. Do not add LinkedIn unless explicitly requested.
- Reuse existing section and component patterns before adding new bespoke UI.

## Backend Rules
- Keep contact submissions compatible with the current `/api/contact` and `/api/health` endpoints.
- Do not change admin or token behavior unless the task is specifically about backend auth or operations.

## Preferred Validation
- For frontend-only edits, verify the affected markup and JavaScript paths carefully.
- For repo-wide confidence, run `python -m pytest -q` from the repo root.
- If JavaScript changes are made, also run syntax checks when relevant.

## Practical Workflow
- Read the relevant file first, then make the smallest coherent patch.
- Preserve user content, resume links, and current project data unless asked to revise them.
- Call out any operational risk before changing deployment or security scripts.
