from __future__ import annotations

import argparse
import re
from pathlib import Path


HTML_FILES = ["index.html", "admin.html", "cyber-demo.html"]


def _check_file(path: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")

    if not re.search(r"<title>.*?</title>", text, flags=re.IGNORECASE | re.DOTALL):
        errors.append(f"{path.name}: missing <title>")

    if not re.search(r"<meta\s+name=[\"']description[\"']\s+content=[\"'].+?[\"']", text, flags=re.IGNORECASE | re.DOTALL):
        errors.append(f"{path.name}: missing meta description")

    if not re.search(r"<a[^>]+href=[\"']#mainContent[\"'][^>]*>\s*Skip to main content\s*</a>", text, flags=re.IGNORECASE):
        errors.append(f"{path.name}: missing skip link to #mainContent")

    if not re.search(r"<main[^>]+id=[\"']mainContent[\"']", text, flags=re.IGNORECASE):
        errors.append(f"{path.name}: missing main landmark id='mainContent'")

    img_tags = re.findall(r"<img\b[^>]*>", text, flags=re.IGNORECASE)
    for idx, tag in enumerate(img_tags, start=1):
        if not re.search(r"\balt=", tag, flags=re.IGNORECASE):
            errors.append(f"{path.name}: img#{idx} missing alt attribute")
        if not re.search(r"\bloading=", tag, flags=re.IGNORECASE):
            errors.append(f"{path.name}: img#{idx} missing loading attribute")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Run lightweight accessibility/performance sanity checks.")
    parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    failures: list[str] = []

    for rel in HTML_FILES:
        file_path = repo_root / rel
        if not file_path.exists():
            failures.append(f"Missing required file: {rel}")
            continue
        failures.extend(_check_file(file_path))

    if failures:
        print("[FAIL] Accessibility/performance sanity checks found issues:")
        for issue in failures:
            print(f"  - {issue}")
        return 1

    print("[PASS] Accessibility/performance sanity checks completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

