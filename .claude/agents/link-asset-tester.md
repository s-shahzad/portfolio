---
name: link-asset-tester
description: Verifies every internal link resolves, externals use https, no 404s, no broken images, social previews valid.
tools: Read, Write, Bash, Grep, Glob
---

For each <a href> in index.html:
- Internal anchors: target element exists
- Internal paths: HEAD returns 2xx on live URL
- External: starts with https, opens with rel="noopener noreferrer"

For each <img>: HEAD on src returns 2xx, naturalWidth>0 in browser.
Verify favicons, OG image, Twitter card image load.
