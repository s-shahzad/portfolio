from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


MOJIBAKE_MARKERS = ["Ã", "Â", "â"]
HTML_FILES = ["index.html", "admin.html", "cyber-demo.html"]


def _is_ignored_ref(ref: str) -> bool:
    lower = ref.lower()
    return (
        lower.startswith("http://")
        or lower.startswith("https://")
        or lower.startswith("mailto:")
        or lower.startswith("tel:")
        or lower.startswith("javascript:")
        or lower.startswith("data:")
        or lower.startswith("#")
        or lower.startswith("/api/")
    )


def _normalize_ref_path(raw_ref: str) -> str:
    ref = raw_ref.split("?", 1)[0].split("#", 1)[0].strip()
    return ref


def _check_html_file(path: Path, repo_root: Path) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")

    for marker in MOJIBAKE_MARKERS:
        if marker in text:
            errors.append(f"{path.name}: suspicious mojibake marker '{marker}' found")

    ids = re.findall(r"id\s*=\s*[\"']([^\"']+)[\"']", text, flags=re.IGNORECASE)
    duplicate_ids = sorted({item for item in ids if ids.count(item) > 1})
    for duplicate in duplicate_ids:
        errors.append(f"{path.name}: duplicate id '{duplicate}'")

    id_set = set(ids)
    js_targets = set(re.findall(r"getElementById\(\s*[\"']([^\"']+)[\"']\s*\)", text))
    missing_targets = sorted(target for target in js_targets if target not in id_set)
    for target in missing_targets:
        errors.append(f"{path.name}: getElementById target '{target}' is missing from DOM ids")

    refs = re.findall(r"(?:href|src)\s*=\s*[\"']([^\"']+)[\"']", text, flags=re.IGNORECASE)
    for ref in refs:
        if _is_ignored_ref(ref):
            continue
        normalized = _normalize_ref_path(ref)
        if not normalized:
            continue
        if normalized.startswith("/"):
            target = repo_root / normalized.lstrip("/")
        else:
            target = path.parent / normalized
        if not target.exists():
            errors.append(f"{path.name}: local reference not found -> {ref}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Run static sanity checks on key HTML files.")
    parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    errors: list[str] = []

    for relative_name in HTML_FILES:
        file_path = repo_root / relative_name
        if not file_path.exists():
            errors.append(f"Missing required file: {relative_name}")
            continue
        errors.extend(_check_html_file(file_path, repo_root))

    if errors:
        print("[FAIL] Static sanity checks found issues:")
        for issue in errors:
            print(f"  - {issue}")
        return 1

    print("[PASS] Static sanity checks completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

