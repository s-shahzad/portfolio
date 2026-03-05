from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


def backup_database(source_db: Path, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup_path = backup_dir / f"messages-{stamp}.db"

    with sqlite3.connect(source_db) as src, sqlite3.connect(backup_path) as dst:
        src.backup(dst)

    return backup_path


def prune_old_backups(backup_dir: Path, retention_days: int) -> list[Path]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    removed: list[Path] = []

    for file_path in sorted(backup_dir.glob("messages-*.db")):
        modified = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        if modified < cutoff:
            file_path.unlink(missing_ok=True)
            removed.append(file_path)

    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description="Backup contact_messages/messages.db with retention.")
    parser.add_argument("--source-db", default="contact_messages/messages.db")
    parser.add_argument("--backup-dir", default="backups/contact-db")
    parser.add_argument("--retention-days", type=int, default=30)
    args = parser.parse_args()

    source_db = Path(args.source_db).resolve()
    backup_dir = Path(args.backup_dir).resolve()

    if not source_db.exists():
        raise SystemExit(f"Source database not found: {source_db}")
    if args.retention_days < 1:
        raise SystemExit("retention-days must be >= 1")

    backup_path = backup_database(source_db, backup_dir)
    removed = prune_old_backups(backup_dir, args.retention_days)

    result = {
        "ok": True,
        "source_db": str(source_db),
        "backup_file": str(backup_path),
        "backup_dir": str(backup_dir),
        "retention_days": args.retention_days,
        "removed_count": len(removed),
        "removed": [str(item) for item in removed],
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
