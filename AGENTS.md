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

<!-- BEGIN COST_AWARE_AGENT_PLAYBOOK -->
## Cost-Aware Agent Playbook

Follow this workflow for Paperclip and local AI work:

1. Plan first for non-trivial work. Use a short plan when a task has 3 or more steps, architectural choices, or security impact. If the work goes sideways, stop, revise the plan, then continue. Use planning for verification, not only for building.
2. Keep context small. Read only the files needed for the current decision, summarize long material, and avoid dumping full logs unless the exact lines matter.
3. Use delegation carefully. Offload independent research, exploration, or parallel analysis only when it saves time or context. Give each subagent one focused task.
4. Verify before done. Do not mark work complete until it is proven with commands, tests, logs, screenshots, or API responses. Record the exact verification.
5. Manage tasks explicitly. Keep checkable tasks, mark progress as work completes, explain what changed, and document durable results in the issue or relevant file.
6. Improve from mistakes. When corrected or when a run fails, capture the lesson in the durable task/comment/status surface so the same mistake is not repeated.
7. Demand elegance without overengineering. Prefer the simplest change with minimal blast radius. Fix root causes, avoid temporary patches, and challenge overly complex solutions before presenting them.
8. Resolve bugs autonomously. For bug reports, inspect logs/errors/tests, identify the cause, implement the fix, and rerun failing checks without waiting for hand-holding.
9. Save tokens and time by default. Prefer local Ollama/OpenCode models for routine work. Use larger or paid models only for high-risk judgment, final review, or tasks local models cannot complete. Do not keep high-cost scheduled heartbeats running without a clear need.

Task loop:
- Plan: write the smallest useful checklist.
- Execute: make one focused change at a time.
- Verify: run the most relevant check and capture evidence.
- Report: concise summary, changed files/config, remaining risk.
<!-- END COST_AWARE_AGENT_PLAYBOOK -->

