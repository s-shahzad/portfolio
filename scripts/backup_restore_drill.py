from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


def ensure_contact_db(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS contact_messages (
                id TEXT PRIMARY KEY,
                received_at TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                source TEXT,
                remote_addr TEXT,
                user_agent TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_contact_messages_received_at ON contact_messages(received_at DESC);
            CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
            """
        )
        conn.commit()


def sqlite_backup(source_db: Path, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    backup_file = backup_dir / f"messages-{stamp}.db"
    with sqlite3.connect(source_db) as src, sqlite3.connect(backup_file) as dst:
        src.backup(dst)
    return backup_file


def sqlite_restore(backup_file: Path, restore_db: Path) -> None:
    restore_db.parent.mkdir(parents=True, exist_ok=True)
    if restore_db.exists():
        restore_db.unlink()
    with sqlite3.connect(backup_file) as src, sqlite3.connect(restore_db) as dst:
        src.backup(dst)


def prune_backups(backup_dir: Path, retention_days: int) -> list[str]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    removed: list[str] = []
    for file_path in sorted(backup_dir.glob("messages-*.db")):
        modified = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc)
        if modified < cutoff:
            file_path.unlink(missing_ok=True)
            removed.append(str(file_path))
    return removed


def validate_restore(restore_db: Path) -> dict:
    with sqlite3.connect(restore_db) as conn:
        table_exists = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='contact_messages'"
        ).fetchone() is not None
        row_count = 0
        if table_exists:
            row_count = int(conn.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0])
    return {
        "table_exists": table_exists,
        "row_count": row_count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Monthly backup/restore drill for contact_messages SQLite DB")
    parser.add_argument("--source-db", default="contact_messages/messages.db")
    parser.add_argument("--backup-dir", default="backups/restore-drill")
    parser.add_argument("--restore-db", default="backups/restore-drill/restore-check.db")
    parser.add_argument("--retention-days", type=int, default=120)
    args = parser.parse_args()

    source_db = Path(args.source_db).resolve()
    backup_dir = Path(args.backup_dir).resolve()
    restore_db = Path(args.restore_db).resolve()

    ensure_contact_db(source_db)
    backup_file = sqlite_backup(source_db, backup_dir)
    sqlite_restore(backup_file, restore_db)
    removed = prune_backups(backup_dir, retention_days=max(7, args.retention_days))
    validation = validate_restore(restore_db)

    result = {
        "ok": True,
        "source_db": str(source_db),
        "backup_file": str(backup_file),
        "restore_db": str(restore_db),
        "retention_days": max(7, args.retention_days),
        "removed_count": len(removed),
        "removed": removed,
        **validation,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
