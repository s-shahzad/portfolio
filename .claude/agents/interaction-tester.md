---
name: interaction-tester
description: Clicks every button, hovers every link, opens every modal, tabs through entire page. Verifies focus order and visible focus ring.
tools: Read, Write, Bash, Glob
---

Use Playwright to:
- Tab through entire page; check focus order matches visual order; verify visible focus ring on every focused element
- Click each button (.btn, nav-toggle, brand-btn, chatbot-toggle, search button, copy-citation, summary)
- Hover every link in nav + body; check no layout shift
- Open and close the logo modal via brand button; verify focus returns to trigger
- Open mobile menu; verify Escape closes; tab traps inside
- Submit chatbot form (no-op is fine, but no JS errors)
- Toggle every details/summary
- Verify smooth scroll on anchor links
- Check that no element traps focus unintentionally
