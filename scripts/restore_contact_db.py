from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def restore_database(backup_file: Path, target_db: Path, *, overwrite: bool = False) -> None:
    if not backup_file.exists():
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    target_db.parent.mkdir(parents=True, exist_ok=True)
    if target_db.exists() and not overwrite:
        raise FileExistsError(f"Target DB exists (use --overwrite): {target_db}")

    if target_db.exists():
        target_db.unlink()

    with sqlite3.connect(backup_file) as src, sqlite3.connect(target_db) as dst:
        src.backup(dst)


def validate_contact_schema(target_db: Path) -> dict:
    with sqlite3.connect(target_db) as conn:
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='contact_messages'"
        )
        has_table = cursor.fetchone() is not None
        count = 0
        if has_table:
            count = int(conn.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0])

    return {
        "has_contact_messages_table": has_table,
        "row_count": count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Restore SQLite contact DB from backup file")
    parser.add_argument("--backup-file", required=True)
    parser.add_argument("--target-db", required=True)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    backup_file = Path(args.backup_file).resolve()
    target_db = Path(args.target_db).resolve()

    restore_database(backup_file, target_db, overwrite=args.overwrite)
    validation = validate_contact_schema(target_db)

    result = {
        "ok": True,
        "backup_file": str(backup_file),
        "target_db": str(target_db),
        **validation,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
