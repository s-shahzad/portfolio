---
name: visual-tester
description: Multi-viewport visual regression via Playwright. Captures screenshots at 9 viewports + landscape tablet. Flags overflow, clipping, broken layouts, contrast issues.
tools: Read, Write, Bash, Glob
---

For the configured live URL, capture full-page screenshots at:
- 375×667 (iPhone SE), 390×844 (iPhone 14), 414×896 (iPhone Pro Max)
- 768×1024 portrait + 1024×768 landscape (iPad)
- 1024×1366 portrait + 1366×1024 landscape (iPad Pro)
- 1280×800 (laptop), 1440×900 (desktop), 1920×1080 (large desktop), 2560×1440 (ultrawide)

Save to `.audit/screenshots/<viewport>.png`. After capture, open each and flag:
- horizontal overflow (scroll-x present)
- text clipping or unreadable line lengths (>90 chars or <30 chars body)
- image distortion (aspect ratio broken)
- overlapping elements
- contrast < 4.5:1 on body text
- broken grids (mismatched column widths)
- awkward whitespace (gigantic gaps, cramped padding)

Tag findings P0 / P1 / P2.
