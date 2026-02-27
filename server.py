from __future__ import annotations

import argparse
import hashlib
import hmac
import ipaddress
import json
import os
import re
import secrets
import smtplib
import sqlite3
import ssl
import struct
import time
import zlib
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from http import HTTPStatus
from http.cookies import CookieError, SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
PROJECTS_FILE = DATA_DIR / "projects.json"
CONTACT_DIR = ROOT / "contact_messages"
CONTACT_JSONL_FILE = CONTACT_DIR / "messages.jsonl"
CONTACT_DB_FILE = CONTACT_DIR / "messages.db"
CONTACT_FILE = CONTACT_DB_FILE
MAX_BODY_BYTES = 64 * 1024
IOC_MAX_BODY_BYTES = 256 * 1024
SMTP_TIMEOUT_SECONDS = 10
HONEYPOT_FIELD_NAME = "website"
ADMIN_DEFAULT_LIMIT = 250
ADMIN_MAX_LIMIT = 1000
ADMIN_SESSION_COOKIE_NAME = "portfolio_admin_session"
ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60
CONTACT_CHART_DEFAULT_DAYS = 14
CONTACT_CHART_MAX_DAYS = 90

SMTP_PROVIDER_PRESETS = {
    "gmail": {"host": "smtp.gmail.com", "port": 587, "use_ssl": False, "use_starttls": True},
    "outlook": {"host": "smtp.office365.com", "port": 587, "use_ssl": False, "use_starttls": True},
    "office365": {"host": "smtp.office365.com", "port": 587, "use_ssl": False, "use_starttls": True},
    "hotmail": {"host": "smtp.office365.com", "port": 587, "use_ssl": False, "use_starttls": True},
    "zoho": {"host": "smtp.zoho.com", "port": 587, "use_ssl": False, "use_starttls": True},
}


def _env_text(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _env_bool_opt(name: str) -> bool | None:
    raw = os.getenv(name)
    if raw is None:
        return None
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int, minimum: int | None = None) -> int:
    raw = _env_text(name)
    if not raw:
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    if minimum is not None and value < minimum:
        return minimum
    return value


def _split_recipients(raw: str) -> list[str]:
    if not raw:
        return []
    pieces = raw.replace(";", ",").split(",")
    recipients: list[str] = []
    seen: set[str] = set()
    for piece in pieces:
        item = piece.strip()
        if not item:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        recipients.append(item)
    return recipients


def _load_rate_limit_config() -> dict:
    max_requests = _env_int("PORTFOLIO_CONTACT_RATE_LIMIT_MAX_REQUESTS", 5, minimum=0)
    window_seconds = _env_int("PORTFOLIO_CONTACT_RATE_LIMIT_WINDOW_SECONDS", 300, minimum=1)
    return {
        "enabled": max_requests > 0,
        "max_requests": max_requests,
        "window_seconds": window_seconds,
    }


def load_smtp_config() -> tuple[dict | None, dict]:
    provider = _env_text("PORTFOLIO_SMTP_PROVIDER").lower()
    preset = None
    if provider:
        preset = SMTP_PROVIDER_PRESETS.get(provider)
        if preset is None:
            supported = ", ".join(sorted(SMTP_PROVIDER_PRESETS.keys()))
            return None, {
                "enabled": False,
                "reason": f"Unsupported PORTFOLIO_SMTP_PROVIDER. Use one of: {supported}",
                "provider": provider,
            }

    host = _env_text("PORTFOLIO_SMTP_HOST") or (preset["host"] if preset else "")
    if not host:
        return None, {
            "enabled": False,
            "reason": "Set PORTFOLIO_SMTP_PROVIDER or PORTFOLIO_SMTP_HOST",
            "provider": provider or None,
        }

    raw_port = _env_text("PORTFOLIO_SMTP_PORT")
    if raw_port:
        try:
            port = int(raw_port)
        except ValueError:
            return None, {
                "enabled": False,
                "reason": "PORTFOLIO_SMTP_PORT is invalid",
                "provider": provider or None,
            }
    else:
        port = int(preset["port"]) if preset else 587

    username = _env_text("PORTFOLIO_SMTP_USERNAME")
    password = os.getenv("PORTFOLIO_SMTP_PASSWORD", "")
    sender = _env_text("PORTFOLIO_SMTP_FROM") or username
    recipients = _split_recipients(_env_text("PORTFOLIO_SMTP_TO"))

    default_use_ssl = bool(preset["use_ssl"]) if preset else False
    default_use_starttls = bool(preset["use_starttls"]) if preset else (not default_use_ssl)
    use_ssl = _env_bool_opt("PORTFOLIO_SMTP_SSL")
    use_starttls = _env_bool_opt("PORTFOLIO_SMTP_STARTTLS")
    if use_ssl is None:
        use_ssl = default_use_ssl
    if use_starttls is None:
        use_starttls = default_use_starttls

    if not sender:
        return None, {
            "enabled": False,
            "reason": "PORTFOLIO_SMTP_FROM or PORTFOLIO_SMTP_USERNAME is required",
            "provider": provider or None,
        }
    if not recipients:
        return None, {
            "enabled": False,
            "reason": "PORTFOLIO_SMTP_TO is required (comma-separated supported)",
            "provider": provider or None,
        }
    if use_ssl and use_starttls:
        return None, {
            "enabled": False,
            "reason": "Choose either PORTFOLIO_SMTP_SSL or PORTFOLIO_SMTP_STARTTLS, not both",
            "provider": provider or None,
        }
    if (username and not password) or (password and not username):
        return None, {
            "enabled": False,
            "reason": "Set both PORTFOLIO_SMTP_USERNAME and PORTFOLIO_SMTP_PASSWORD together",
            "provider": provider or None,
        }

    config = {
        "provider": provider or None,
        "host": host,
        "port": port,
        "username": username or None,
        "password": password or None,
        "sender": sender,
        "recipients": recipients,
        "use_ssl": bool(use_ssl),
        "use_starttls": bool(use_starttls),
    }
    status = {
        "enabled": True,
        "reason": "configured",
        "provider": provider or None,
        "host": host,
        "port": port,
        "recipients": recipients,
        "recipient_count": len(recipients),
        "sender": sender,
        "use_ssl": bool(use_ssl),
        "use_starttls": bool(use_starttls),
        "auth": bool(config["username"]),
    }
    return config, status


def load_admin_config() -> tuple[dict, dict]:
    token = os.getenv("PORTFOLIO_ADMIN_TOKEN", "").strip()
    require_token = _env_bool("PORTFOLIO_ADMIN_REQUIRE_TOKEN", False)

    if token:
        mode = "token"
        status = {
            "enabled": True,
            "mode": mode,
            "token_configured": True,
            "reason": "Admin API requires X-Admin-Token or authenticated session",
            "api_path": "/api/admin/messages",
            "ui_path": "/admin.html",
            "require_token": True,
        }
        return {"token": token, "mode": mode, "require_token": True}, status

    if require_token:
        mode = "token_required_not_configured"
        status = {
            "enabled": False,
            "mode": mode,
            "token_configured": False,
            "reason": "PORTFOLIO_ADMIN_REQUIRE_TOKEN=true but PORTFOLIO_ADMIN_TOKEN is missing",
            "api_path": "/api/admin/messages",
            "ui_path": "/admin.html",
            "require_token": True,
        }
        return {"token": None, "mode": mode, "require_token": True}, status

    mode = "localhost_only"
    status = {
        "enabled": True,
        "mode": mode,
        "token_configured": False,
        "reason": "Admin API allowed only from localhost unless PORTFOLIO_ADMIN_TOKEN is set",
        "api_path": "/api/admin/messages",
        "ui_path": "/admin.html",
        "require_token": False,
    }
    return {"token": None, "mode": mode, "require_token": False}, status


def _new_sqlite_connection() -> sqlite3.Connection:
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(CONTACT_DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def _insert_contact_record(conn: sqlite3.Connection, record: dict) -> bool:
    cur = conn.execute(
        """
        INSERT OR IGNORE INTO contact_messages (
            id, received_at, name, email, message, source, remote_addr, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            record["id"],
            record["received_at"],
            record["name"],
            record["email"],
            record["message"],
            record.get("source") or None,
            record.get("remote_addr") or None,
            record.get("user_agent") or None,
        ),
    )
    return cur.rowcount > 0


def _legacy_record_id(line_number: int, raw_line: str) -> str:
    digest = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()[:12]
    return f"legacy-{line_number}-{digest}"


def migrate_legacy_jsonl_to_sqlite() -> dict:
    result = {"checked": True, "legacy_exists": CONTACT_JSONL_FILE.exists(), "migrated": 0, "skipped": 0}
    if not CONTACT_JSONL_FILE.exists():
        return result

    try:
        lines = CONTACT_JSONL_FILE.read_text(encoding="utf-8").splitlines()
    except OSError:
        return result

    if not lines:
        return result

    with _new_sqlite_connection() as conn:
        for line_number, raw_line in enumerate(lines, start=1):
            if not raw_line.strip():
                continue
            try:
                data = json.loads(raw_line)
            except json.JSONDecodeError:
                result["skipped"] += 1
                continue
            if not isinstance(data, dict):
                result["skipped"] += 1
                continue

            message = str(data.get("message") or "").strip()
            if not message:
                result["skipped"] += 1
                continue

            record = {
                "id": str(data.get("id") or _legacy_record_id(line_number, raw_line)),
                "received_at": str(data.get("received_at") or datetime.now(timezone.utc).isoformat()),
                "name": str(data.get("name") or "").strip() or "Unknown",
                "email": str(data.get("email") or "").strip() or "unknown@example.com",
                "message": message,
                "source": str(data.get("source") or "").strip(),
                "remote_addr": str(data.get("remote_addr") or "").strip() or None,
                "user_agent": str(data.get("user_agent") or "").strip() or None,
            }
            if _insert_contact_record(conn, record):
                result["migrated"] += 1
            else:
                result["skipped"] += 1
        conn.commit()

    return result


def init_contact_store() -> dict:
    CONTACT_DIR.mkdir(parents=True, exist_ok=True)
    with _new_sqlite_connection() as conn:
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
    return migrate_legacy_jsonl_to_sqlite()


def load_projects_catalog() -> dict:
    if not PROJECTS_FILE.exists():
        return {"featured": [], "updated_at": None, "source": str(PROJECTS_FILE.relative_to(ROOT))}
    try:
        data = json.loads(PROJECTS_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"featured": [], "updated_at": None, "source": str(PROJECTS_FILE.relative_to(ROOT))}
    if not isinstance(data, dict):
        return {"featured": [], "updated_at": None, "source": str(PROJECTS_FILE.relative_to(ROOT))}
    featured = data.get("featured") if isinstance(data.get("featured"), list) else []
    return {"featured": featured, "updated_at": data.get("updated_at"), "source": str(PROJECTS_FILE.relative_to(ROOT))}


def _svg_escape(text: object) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def query_contact_daily_counts(days: int) -> list[dict[str, object]]:
    days = max(1, min(CONTACT_CHART_MAX_DAYS, int(days)))
    today_utc = datetime.now(timezone.utc).date()
    start_date = today_utc - timedelta(days=days - 1)
    sql = (
        "SELECT substr(received_at, 1, 10) AS day, COUNT(*) AS count "
        "FROM contact_messages "
        "WHERE substr(received_at, 1, 10) >= ? "
        "GROUP BY substr(received_at, 1, 10) "
        "ORDER BY day ASC"
    )
    with CONTACT_DB_LOCK:
        with _new_sqlite_connection() as conn:
            rows = conn.execute(sql, (start_date.isoformat(),)).fetchall()

    counts_by_day: dict[str, int] = {}
    for row in rows:
        day = str(row["day"] or "")
        if not day:
            continue
        counts_by_day[day] = int(row["count"] or 0)

    points: list[dict[str, object]] = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        key = day.isoformat()
        points.append({"date": key, "count": int(counts_by_day.get(key, 0))})
    return points


def render_contact_trend_svg(points: list[dict[str, object]], *, title: str, subtitle: str) -> str:
    width, height = 980, 360
    pad_left, pad_right = 56, 18
    pad_top, pad_bottom = 58, 54
    plot_width = max(1, width - pad_left - pad_right)
    plot_height = max(1, height - pad_top - pad_bottom)

    normalized_points = []
    for item in points:
        normalized_points.append(
            {
                "date": str(item.get("date") or ""),
                "count": max(0, int(item.get("count") or 0)),
            }
        )

    if not normalized_points:
        normalized_points = [{"date": datetime.now(timezone.utc).date().isoformat(), "count": 0}]

    counts = [int(item["count"]) for item in normalized_points]
    max_count = max(1, max(counts))
    total_count = sum(counts)
    point_count = len(normalized_points)

    slot_width = plot_width / max(1, point_count)
    gap = 6 if point_count <= 20 else (4 if point_count <= 45 else 2)
    bar_width = max(1.0, slot_width - gap)
    grid_steps = 4
    label_step = max(1, (point_count + 9) // 10)

    parts: list[str] = []
    parts.append('<?xml version="1.0" encoding="UTF-8"?>')
    parts.append(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="chartTitle chartDesc">'
    )
    parts.append("<defs>")
    parts.append('<linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">')
    parts.append('<stop offset="0%" stop-color="#142235"/>')
    parts.append('<stop offset="100%" stop-color="#0a131e"/>')
    parts.append("</linearGradient>")
    parts.append('<linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">')
    parts.append('<stop offset="0%" stop-color="#89c7ff"/>')
    parts.append('<stop offset="100%" stop-color="#4b84c8"/>')
    parts.append("</linearGradient>")
    parts.append("</defs>")
    parts.append(f'<rect x="0" y="0" width="{width}" height="{height}" rx="12" fill="url(#bgGrad)"/>')
    parts.append(f'<title id="chartTitle">{_svg_escape(title)}</title>')
    parts.append(f'<desc id="chartDesc">{_svg_escape(subtitle)}</desc>')
    parts.append(f'<text x="{pad_left}" y="28" fill="#eaf2ff" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700">{_svg_escape(title)}</text>')
    parts.append(f'<text x="{pad_left}" y="46" fill="#9fb2cc" font-family="Segoe UI, Arial, sans-serif" font-size="12">{_svg_escape(subtitle)}</text>')
    parts.append(
        f'<text x="{width - pad_right}" y="28" fill="#9fb2cc" font-family="Segoe UI, Arial, sans-serif" font-size="12" text-anchor="end">Total: {total_count}</text>'
    )
    parts.append(f'<rect x="{pad_left}" y="{pad_top}" width="{plot_width}" height="{plot_height}" rx="10" fill="#0d1724" stroke="rgba(149,182,226,0.18)" stroke-width="1"/>')

    for step in range(grid_steps + 1):
        value = (max_count * (grid_steps - step)) / grid_steps
        y = pad_top + (plot_height * step / grid_steps)
        line_color = 'rgba(149,182,226,0.16)' if step < grid_steps else 'rgba(149,182,226,0.24)'
        parts.append(f'<line x1="{pad_left}" y1="{y:.2f}" x2="{pad_left + plot_width}" y2="{y:.2f}" stroke="{line_color}" stroke-width="1"/>')
        parts.append(
            f'<text x="{pad_left - 8}" y="{y + 4:.2f}" fill="#9fb2cc" font-family="Segoe UI, Arial, sans-serif" font-size="11" text-anchor="end">{int(round(value))}</text>'
        )

    for index, item in enumerate(normalized_points):
        count = int(item["count"])
        date_label = str(item["date"])
        short_label = date_label[5:] if len(date_label) >= 10 else date_label
        x = pad_left + (index * slot_width) + ((slot_width - bar_width) / 2)
        bar_height = (count / max_count) * plot_height if max_count > 0 else 0
        y = pad_top + (plot_height - bar_height)
        fill = 'url(#barGrad)' if count > 0 else '#334a66'
        parts.append(
            f'<rect x="{x:.2f}" y="{y:.2f}" width="{bar_width:.2f}" height="{max(1.0 if count > 0 else 0.8, bar_height):.2f}" rx="4" fill="{fill}" opacity="{1 if count > 0 else 0.55}"><title>{_svg_escape(date_label)}: {count}</title></rect>'
        )
        if count > 0 and point_count <= 24:
            parts.append(
                f'<text x="{x + bar_width / 2:.2f}" y="{max(pad_top + 12, y - 6):.2f}" fill="#dceaff" font-family="Segoe UI, Arial, sans-serif" font-size="10" text-anchor="middle">{count}</text>'
            )
        if (index % label_step == 0) or (index == point_count - 1):
            parts.append(
                f'<text x="{x + bar_width / 2:.2f}" y="{pad_top + plot_height + 16:.2f}" fill="#9fb2cc" font-family="Consolas, monospace" font-size="10" text-anchor="middle">{_svg_escape(short_label)}</text>'
            )

    if total_count == 0:
        parts.append(
            f'<text x="{pad_left + plot_width / 2:.2f}" y="{pad_top + plot_height / 2:.2f}" fill="#9fb2cc" font-family="Segoe UI, Arial, sans-serif" font-size="14" text-anchor="middle">No contact submissions yet</text>'
        )

    parts.append("</svg>")
    return "\n".join(parts)


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + chunk_type + data + struct.pack(">I", crc)


def _encode_png_rgb(width: int, height: int, pixels: bytearray) -> bytes:
    stride = width * 3
    if width <= 0 or height <= 0:
        raise ValueError("Invalid PNG dimensions")
    if len(pixels) != stride * height:
        raise ValueError("Pixel buffer length mismatch")

    raw = bytearray(height * (stride + 1))
    src = 0
    dst = 0
    for _ in range(height):
        raw[dst] = 0
        dst += 1
        raw[dst : dst + stride] = pixels[src : src + stride]
        dst += stride
        src += stride

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), level=9)
    return b"\x89PNG\r\n\x1a\n" + _png_chunk(b"IHDR", ihdr) + _png_chunk(b"IDAT", idat) + _png_chunk(b"IEND", b"")


def render_contact_trend_png(points: list[dict[str, object]], *, title: str, subtitle: str) -> bytes:
    del title, subtitle  # PNG export is a simplified raster chart without text labels.

    width, height = 980, 360
    pad_left, pad_right = 56, 18
    pad_top, pad_bottom = 58, 54
    plot_x = pad_left
    plot_y = pad_top
    plot_width = max(1, width - pad_left - pad_right)
    plot_height = max(1, height - pad_top - pad_bottom)

    normalized_points: list[dict[str, object]] = []
    for item in points:
        normalized_points.append(
            {
                "date": str(item.get("date") or ""),
                "count": max(0, int(item.get("count") or 0)),
            }
        )
    if not normalized_points:
        normalized_points = [{"date": datetime.now(timezone.utc).date().isoformat(), "count": 0}]

    counts = [int(item["count"]) for item in normalized_points]
    max_count = max(1, max(counts))
    total_count = sum(counts)
    point_count = len(normalized_points)

    slot_width = plot_width / max(1, point_count)
    gap = 6 if point_count <= 20 else (4 if point_count <= 45 else 2)
    bar_width = max(1, int(round(slot_width - gap)))
    grid_steps = 4

    stride = width * 3
    pixels = bytearray(stride * height)

    def _clamp(value: int) -> int:
        if value < 0:
            return 0
        if value > 255:
            return 255
        return value

    def _fill_rect(x: int, y: int, w: int, h: int, color: tuple[int, int, int]):
        if w <= 0 or h <= 0:
            return
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(width, x + w)
        y1 = min(height, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        row = bytes((_clamp(color[0]), _clamp(color[1]), _clamp(color[2]))) * (x1 - x0)
        for yy in range(y0, y1):
            off = yy * stride + (x0 * 3)
            pixels[off : off + len(row)] = row

    def _fill_vgradient(x: int, y: int, w: int, h: int, top: tuple[int, int, int], bottom: tuple[int, int, int]):
        if w <= 0 or h <= 0:
            return
        x0 = max(0, x)
        y0 = max(0, y)
        x1 = min(width, x + w)
        y1 = min(height, y + h)
        if x1 <= x0 or y1 <= y0:
            return
        usable_h = max(1, y1 - y0)
        for row_idx, yy in enumerate(range(y0, y1)):
            t = row_idx / max(1, usable_h - 1)
            r = int(top[0] + (bottom[0] - top[0]) * t)
            g = int(top[1] + (bottom[1] - top[1]) * t)
            b = int(top[2] + (bottom[2] - top[2]) * t)
            row = bytes((_clamp(r), _clamp(g), _clamp(b))) * (x1 - x0)
            off = yy * stride + (x0 * 3)
            pixels[off : off + len(row)] = row

    def _draw_hline(y: int, x0: int, x1: int, color: tuple[int, int, int]):
        _fill_rect(x0, y, x1 - x0, 1, color)

    def _draw_vline(x: int, y0: int, y1: int, color: tuple[int, int, int]):
        _fill_rect(x, y0, 1, y1 - y0, color)

    _fill_vgradient(0, 0, width, height, (20, 34, 53), (10, 19, 30))
    _fill_rect(0, 0, width, 52, (16, 28, 44))
    _draw_hline(52, 0, width, (34, 52, 78))

    _fill_rect(plot_x, plot_y, plot_width, plot_height, (13, 23, 36))
    _draw_hline(plot_y, plot_x, plot_x + plot_width, (60, 82, 112))
    _draw_hline(plot_y + plot_height - 1, plot_x, plot_x + plot_width, (74, 101, 136))
    _draw_vline(plot_x, plot_y, plot_y + plot_height, (60, 82, 112))
    _draw_vline(plot_x + plot_width - 1, plot_y, plot_y + plot_height, (60, 82, 112))

    for step in range(1, grid_steps):
        y = plot_y + int(round(plot_height * step / grid_steps))
        _draw_hline(y, plot_x, plot_x + plot_width, (39, 55, 80))

    accent_top = (137, 199, 255)
    accent_bottom = (75, 132, 200)
    zero_bar = (51, 74, 102)

    for idx, item in enumerate(normalized_points):
        count = int(item["count"])
        bar_h = int(round((count / max_count) * plot_height)) if max_count > 0 else 0
        bar_h = max(0, min(plot_height, bar_h))
        x = plot_x + int(round(idx * slot_width + max(0.0, (slot_width - bar_width) / 2)))
        if count <= 0:
            _fill_rect(x, plot_y + plot_height - 1, bar_width, 1, zero_bar)
            continue
        bar_y = plot_y + (plot_height - bar_h)
        _fill_vgradient(x, bar_y, bar_width, max(1, bar_h), accent_top, accent_bottom)
        _fill_rect(x, bar_y, bar_width, 1, (178, 226, 255))

    marker_w = min(max(40, point_count * 5), 150)
    marker_x = width - marker_w - 18
    marker_color = (155, 240, 188) if total_count > 0 else (159, 178, 204)
    _fill_rect(marker_x, 18, marker_w, 6, marker_color)
    _fill_rect(marker_x, 30, max(32, min(marker_w, total_count * 6)), 4, (130, 184, 255))

    return _encode_png_rgb(width, height, pixels)


def _unique_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def extract_iocs(text: str) -> dict:
    url_re = re.compile(r"\bhttps?://[^\s<>\"']+", re.IGNORECASE)
    ipv4_re = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    domain_re = re.compile(r"\b(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}\b")
    md5_re = re.compile(r"\b[a-fA-F0-9]{32}\b")
    sha1_re = re.compile(r"\b[a-fA-F0-9]{40}\b")
    sha256_re = re.compile(r"\b[a-fA-F0-9]{64}\b")

    urls = _unique_preserve_order([m.group(0).rstrip(".,;:)]}>") for m in url_re.finditer(text)])

    ipv4_items: list[dict] = []
    seen_ips: set[str] = set()
    for match in ipv4_re.finditer(text):
        raw = match.group(0)
        try:
            ip_obj = ipaddress.ip_address(raw)
        except ValueError:
            continue
        if ip_obj.version != 4:
            continue
        ip_value = str(ip_obj)
        if ip_value in seen_ips:
            continue
        seen_ips.add(ip_value)
        if ip_obj.is_private:
            cls = "private"
        elif ip_obj.is_loopback:
            cls = "loopback"
        elif ip_obj.is_link_local:
            cls = "link_local"
        elif ip_obj.is_multicast:
            cls = "multicast"
        elif ip_obj.is_reserved:
            cls = "reserved"
        else:
            cls = "public"
        ipv4_items.append({"value": ip_value, "classification": cls})

    domains = []
    for match in domain_re.finditer(text):
        if match.start() > 0 and text[match.start() - 1] == "@":
            continue
        domains.append(match.group(0).rstrip(".,;:)]}>").lower())
    domains = _unique_preserve_order(domains)

    md5 = _unique_preserve_order([m.group(0).lower() for m in md5_re.finditer(text)])
    sha1 = _unique_preserve_order([m.group(0).lower() for m in sha1_re.finditer(text)])
    sha256 = _unique_preserve_order([m.group(0).lower() for m in sha256_re.finditer(text)])
    md5 = [v for v in md5 if v not in sha1 and v not in sha256]
    sha1 = [v for v in sha1 if v not in sha256]

    counts = {
        "urls": len(urls),
        "ipv4": len(ipv4_items),
        "domains": len(domains),
        "md5": len(md5),
        "sha1": len(sha1),
        "sha256": len(sha256),
        "total_iocs": len(urls) + len(ipv4_items) + len(domains) + len(md5) + len(sha1) + len(sha256),
    }
    return {"counts": counts, "urls": urls, "ipv4": ipv4_items, "domains": domains, "hashes": {"md5": md5, "sha1": sha1, "sha256": sha256}}

def _cookie_header(
    name: str,
    value: str,
    *,
    path: str = "/",
    max_age: int | None = None,
    http_only: bool = True,
    secure: bool = False,
) -> str:
    cookie = SimpleCookie()
    cookie[name] = value
    morsel = cookie[name]
    morsel["path"] = path
    morsel["samesite"] = "Lax"
    if http_only:
        morsel["httponly"] = True
    if secure:
        morsel["secure"] = True
    if max_age is not None:
        morsel["max-age"] = str(int(max_age))
    return morsel.OutputString()


def _cleanup_expired_admin_sessions_locked() -> None:
    now = int(time.time())
    for sid in [k for k, exp in ADMIN_SESSIONS.items() if exp <= now]:
        ADMIN_SESSIONS.pop(sid, None)


def _create_admin_session_id() -> tuple[str, int]:
    sid = secrets.token_urlsafe(32)
    exp = int(time.time()) + ADMIN_SESSION_TTL_SECONDS
    with ADMIN_SESSIONS_LOCK:
        _cleanup_expired_admin_sessions_locked()
        ADMIN_SESSIONS[sid] = exp
    return sid, exp


def _validate_admin_session_id(session_id: str) -> bool:
    if not session_id:
        return False
    with ADMIN_SESSIONS_LOCK:
        _cleanup_expired_admin_sessions_locked()
        exp = ADMIN_SESSIONS.get(session_id)
        if not exp:
            return False
        if exp <= int(time.time()):
            ADMIN_SESSIONS.pop(session_id, None)
            return False
        return True


def _revoke_admin_session_id(session_id: str) -> None:
    if not session_id:
        return
    with ADMIN_SESSIONS_LOCK:
        ADMIN_SESSIONS.pop(session_id, None)


SMTP_CONFIG, SMTP_STATUS = load_smtp_config()
ADMIN_CONFIG, ADMIN_STATUS = load_admin_config()
RATE_LIMIT_CONFIG = _load_rate_limit_config()
ENABLE_HSTS = _env_bool("PORTFOLIO_ENABLE_HSTS", False)
STATIC_CACHE_MAX_AGE_SECONDS = _env_int("PORTFOLIO_STATIC_CACHE_MAX_AGE_SECONDS", 604800, minimum=0)
RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
RATE_LIMIT_LOCK = Lock()
MESSAGES_LOCK = Lock()
CONTACT_DB_LOCK = Lock()
ADMIN_SESSIONS: dict[str, int] = {}
ADMIN_SESSIONS_LOCK = Lock()


class PortfolioHandler(SimpleHTTPRequestHandler):
    server_version = "PortfolioPythonContact/1.4"

    def __init__(self, *args, **kwargs):
        self._response_headers: dict[str, str] = {}
        self._response_content_type = ""
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_response(self, code, message=None):
        self._response_headers = {}
        self._response_content_type = ""
        super().send_response(code, message)

    def send_header(self, keyword, value):
        key = str(keyword).lower()
        val = str(value)
        self._response_headers[key] = val
        if key == "content-type":
            self._response_content_type = val.lower()
        super().send_header(keyword, value)

    def _request_path(self) -> str:
        try:
            return urlparse(self.path).path or "/"
        except Exception:
            return "/"

    def _is_https_request(self) -> bool:
        try:
            if isinstance(self.request, ssl.SSLSocket):
                return True
        except Exception:
            pass
        forwarded = self.headers.get("X-Forwarded-Proto", "")
        if forwarded:
            return forwarded.split(",", 1)[0].strip().lower() == "https"
        return False

    def _is_html_response(self) -> bool:
        return "text/html" in (self._response_content_type or "")

    def _is_static_asset_request(self) -> bool:
        path = self._request_path().lower()
        if path.startswith("/assets/") or path.startswith("/case-studies/"):
            return True
        static_exts = (
            ".css",
            ".js",
            ".png",
            ".jpg",
            ".jpeg",
            ".svg",
            ".webp",
            ".ico",
            ".woff",
            ".woff2",
            ".pdf",
            ".json",
        )
        return path.endswith(static_exts)

    def _default_csp_value(self) -> str:
        # Keep inline scripts/styles permitted because this portfolio uses inline bootstraps.
        return (
            "default-src 'self'; "
            "base-uri 'self'; "
            "frame-ancestors 'none'; "
            "object-src 'none'; "
            "form-action 'self'; "
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https:; "
            "font-src 'self' data: https://cdn.jsdelivr.net; "
            "connect-src 'self'"
        )

    def end_headers(self):
        if "x-content-type-options" not in self._response_headers:
            self.send_header("X-Content-Type-Options", "nosniff")
        if "x-frame-options" not in self._response_headers:
            self.send_header("X-Frame-Options", "DENY")
        if "referrer-policy" not in self._response_headers:
            self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        if "permissions-policy" not in self._response_headers:
            self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        if "cross-origin-opener-policy" not in self._response_headers:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        if "cross-origin-resource-policy" not in self._response_headers:
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")

        if ENABLE_HSTS and self._is_https_request() and "strict-transport-security" not in self._response_headers:
            self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        if self._is_html_response() and "content-security-policy" not in self._response_headers:
            self.send_header("Content-Security-Policy", self._default_csp_value())

        if "cache-control" not in self._response_headers:
            if self._is_static_asset_request() and STATIC_CACHE_MAX_AGE_SECONDS > 0:
                self.send_header("Cache-Control", f"public, max-age={STATIC_CACHE_MAX_AGE_SECONDS}, immutable")
            elif self._is_html_response():
                self.send_header("Cache-Control", "no-cache")

        super().end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        if route == "/api/health":
            return self._send_json(
                {
                    "ok": True,
                    "server": self.server_version,
                    "contact_store": str(CONTACT_DB_FILE.relative_to(ROOT)),
                    "legacy_contact_store": str(CONTACT_JSONL_FILE.relative_to(ROOT)),
                    "projects_store": str(PROJECTS_FILE.relative_to(ROOT)),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "smtp_enabled": SMTP_STATUS.get("enabled", False),
                    "smtp_status": SMTP_STATUS.get("reason", "unknown"),
                    "smtp_provider": SMTP_STATUS.get("provider"),
                    "smtp_recipients": SMTP_STATUS.get("recipients"),
                    "spam_protection": {
                        "honeypot_field": HONEYPOT_FIELD_NAME,
                        "rate_limit_enabled": RATE_LIMIT_CONFIG["enabled"],
                        "rate_limit_max_requests": RATE_LIMIT_CONFIG["max_requests"],
                        "rate_limit_window_seconds": RATE_LIMIT_CONFIG["window_seconds"],
                    },
                    "admin_panel": {
                        "enabled": ADMIN_STATUS["enabled"],
                        "mode": ADMIN_STATUS["mode"],
                        "token_configured": ADMIN_STATUS["token_configured"],
                        "reason": ADMIN_STATUS["reason"],
                        "ui_path": ADMIN_STATUS["ui_path"],
                        "api_path": ADMIN_STATUS["api_path"],
                        "session_cookie": ADMIN_SESSION_COOKIE_NAME,
                    },
                }
            )
        if route == "/api/projects":
            return self._handle_projects_api()
        if route == "/api/public/contact-trend.svg":
            return self._handle_public_contact_trend_svg(parsed.query)
        if route == "/api/public/contact-trend.png":
            return self._handle_public_contact_trend_png(parsed.query)
        if route == "/api/admin/contact-trend.svg":
            return self._handle_admin_contact_trend_svg(parsed.query)
        if route == "/api/admin/contact-trend.png":
            return self._handle_admin_contact_trend_png(parsed.query)
        if route == "/api/admin/messages":
            return self._handle_admin_list(parsed.query)
        if route == "/admin.html":
            if not self._authorize_admin_api():
                return
            return super().do_GET()
        return super().do_GET()

    def do_POST(self):
        route = urlparse(self.path).path
        if route == "/api/contact":
            return self._handle_contact_submit()
        if route == "/api/admin/login":
            return self._handle_admin_login()
        if route == "/api/admin/logout":
            return self._handle_admin_logout()
        if route == "/api/admin/messages/delete":
            return self._handle_admin_delete()
        if route == "/api/cyber/ioc/extract":
            return self._handle_ioc_extract()
        return self._send_json({"ok": False, "error": "Route not found"}, status=HTTPStatus.NOT_FOUND)

    def _handle_projects_api(self):
        catalog = load_projects_catalog()
        featured = catalog.get("featured") if isinstance(catalog.get("featured"), list) else []
        return self._send_json(
            {
                "ok": True,
                "featured": featured,
                "counts": {"featured": len(featured)},
                "updated_at": catalog.get("updated_at"),
                "source": catalog.get("source"),
            }
        )

    def _parse_contact_trend_days(self, query: str) -> int:
        params = parse_qs(query)
        raw_days = params.get("days", [str(CONTACT_CHART_DEFAULT_DAYS)])[0]
        try:
            days = int(raw_days)
        except ValueError:
            days = CONTACT_CHART_DEFAULT_DAYS
        return max(3, min(CONTACT_CHART_MAX_DAYS, days))

    def _handle_contact_trend_chart(self, query: str, *, require_admin: bool, image_format: str):
        if require_admin and not self._authorize_admin_api():
            return

        days = self._parse_contact_trend_days(query)
        title = "Contact Submissions Trend"
        try:
            points = query_contact_daily_counts(days)
            total_count = sum(int(item.get("count") or 0) for item in points)
            subtitle = f"Last {days} days (UTC) - SQLite - total submissions: {total_count}"
            if image_format == "svg":
                return self._send_svg(render_contact_trend_svg(points, title=title, subtitle=subtitle))
            if image_format == "png":
                return self._send_png(render_contact_trend_png(points, title=title, subtitle=subtitle))
            return self._send_json({"ok": False, "error": "Unsupported chart format"}, status=HTTPStatus.BAD_REQUEST)
        except sqlite3.Error as exc:
            fallback_points = [{"date": datetime.now(timezone.utc).date().isoformat(), "count": 0}]
            subtitle = f"SQLite error while building chart: {exc}"
            if image_format == "svg":
                return self._send_svg(render_contact_trend_svg(fallback_points, title=title, subtitle=subtitle), status=HTTPStatus.INTERNAL_SERVER_ERROR)
            if image_format == "png":
                return self._send_png(render_contact_trend_png(fallback_points, title=title, subtitle=subtitle), status=HTTPStatus.INTERNAL_SERVER_ERROR)
            return self._send_json({"ok": False, "error": "Unsupported chart format"}, status=HTTPStatus.BAD_REQUEST)

    def _handle_public_contact_trend_svg(self, query: str):
        return self._handle_contact_trend_chart(query, require_admin=False, image_format="svg")

    def _handle_public_contact_trend_png(self, query: str):
        return self._handle_contact_trend_chart(query, require_admin=False, image_format="png")

    def _handle_admin_contact_trend_svg(self, query: str):
        return self._handle_contact_trend_chart(query, require_admin=True, image_format="svg")

    def _handle_admin_contact_trend_png(self, query: str):
        return self._handle_contact_trend_chart(query, require_admin=True, image_format="png")

    def _handle_ioc_extract(self):
        try:
            payload = self._read_json_body(max_body_bytes=IOC_MAX_BODY_BYTES)
        except ValueError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

        text = payload.get("text", "")
        if not isinstance(text, str):
            text = str(text)
        if not text.strip():
            return self._send_json({"ok": False, "error": "text is required"}, status=HTTPStatus.BAD_REQUEST)
        if len(text.encode("utf-8", errors="ignore")) > IOC_MAX_BODY_BYTES:
            return self._send_json({"ok": False, "error": "text is too large"}, status=HTTPStatus.BAD_REQUEST)

        return self._send_json({"ok": True, **extract_iocs(text)})

    def _handle_admin_login(self):
        if ADMIN_CONFIG.get("require_token") and not ADMIN_CONFIG.get("token"):
            return self._send_json(
                {
                    "ok": False,
                    "error": "Admin token is required but not configured. Set PORTFOLIO_ADMIN_TOKEN.",
                },
                status=HTTPStatus.SERVICE_UNAVAILABLE,
            )

        if not ADMIN_CONFIG.get("token"):
            if self._is_loopback_client():
                return self._send_json({"ok": True, "message": "Admin login not required in localhost-only mode", "admin_mode": ADMIN_STATUS["mode"]})
            return self._send_json({"ok": False, "error": "PORTFOLIO_ADMIN_TOKEN is not configured on the server."}, status=HTTPStatus.BAD_REQUEST)

        try:
            payload = self._read_json_body()
        except ValueError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

        provided = str(payload.get("token", "")).strip()
        if not provided or not hmac.compare_digest(provided, str(ADMIN_CONFIG["token"])):
            return self._send_json({"ok": False, "error": "Invalid admin token"}, status=HTTPStatus.UNAUTHORIZED)

        session_id, expires_at = _create_admin_session_id()
        cookie_header = _cookie_header(
            ADMIN_SESSION_COOKIE_NAME,
            session_id,
            max_age=ADMIN_SESSION_TTL_SECONDS,
            secure=self._is_https_request(),
        )
        return self._send_json(
            {
                "ok": True,
                "message": "Admin login successful",
                "admin_mode": ADMIN_STATUS["mode"],
                "session_cookie": ADMIN_SESSION_COOKIE_NAME,
                "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
            },
            extra_headers={"Set-Cookie": cookie_header},
        )

    def _handle_admin_logout(self):
        session_id = self._extract_cookie_value(ADMIN_SESSION_COOKIE_NAME)
        if session_id:
            _revoke_admin_session_id(session_id)
        return self._send_json(
            {"ok": True, "message": "Admin session cleared"},
            extra_headers={
                "Set-Cookie": _cookie_header(
                    ADMIN_SESSION_COOKIE_NAME,
                    "",
                    max_age=0,
                    secure=self._is_https_request(),
                )
            },
        )
    def _handle_contact_submit(self):
        rate_limit = self._check_contact_rate_limit()
        if rate_limit["limited"]:
            retry_after_seconds = rate_limit["retry_after_seconds"]
            return self._send_json(
                {
                    "ok": False,
                    "error": f"Too many contact submissions. Try again in {retry_after_seconds} seconds.",
                    "rate_limit": {
                        "limited": True,
                        "retry_after_seconds": retry_after_seconds,
                        "max_requests": RATE_LIMIT_CONFIG["max_requests"],
                        "window_seconds": RATE_LIMIT_CONFIG["window_seconds"],
                    },
                },
                status=HTTPStatus.TOO_MANY_REQUESTS,
                extra_headers={"Retry-After": str(retry_after_seconds)},
            )

        try:
            payload = self._read_json_body()
        except ValueError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

        if self._honeypot_triggered(payload):
            return self._send_json(
                {
                    "ok": True,
                    "message": "Contact message received",
                    "spam_blocked": True,
                    "spam_reason": "honeypot",
                    "rate_limit": {
                        "limited": False,
                        "remaining": rate_limit["remaining"],
                        "max_requests": RATE_LIMIT_CONFIG["max_requests"],
                        "window_seconds": RATE_LIMIT_CONFIG["window_seconds"],
                    },
                },
                status=HTTPStatus.ACCEPTED,
            )

        try:
            record = self._validate_contact_payload(payload)
            self._save_contact_record(record)
        except ValueError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
        except (OSError, sqlite3.Error) as exc:
            return self._send_json({"ok": False, "error": f"Unable to save message: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

        email_result = self._send_contact_email(record)
        response_message = "Contact message saved to SQLite"
        if email_result["email_configured"] and email_result["email_sent"]:
            response_message = "Contact message saved to SQLite and email notification sent"
        elif email_result["email_configured"] and not email_result["email_sent"]:
            response_message = "Contact message saved to SQLite, but email notification failed"

        return self._send_json(
            {
                "ok": True,
                "message": response_message,
                "saved_to": str(CONTACT_DB_FILE.relative_to(ROOT)),
                "spam_blocked": False,
                "rate_limit": {
                    "limited": False,
                    "remaining": rate_limit["remaining"],
                    "max_requests": RATE_LIMIT_CONFIG["max_requests"],
                    "window_seconds": RATE_LIMIT_CONFIG["window_seconds"],
                },
                **email_result,
            },
            status=HTTPStatus.CREATED,
        )

    def _handle_admin_list(self, query: str):
        if not self._authorize_admin_api():
            return

        params = parse_qs(query)
        limit = ADMIN_DEFAULT_LIMIT
        raw_limit = params.get("limit", [None])[0]
        if raw_limit is not None:
            try:
                limit = int(raw_limit)
            except ValueError:
                return self._send_json({"ok": False, "error": "Invalid limit parameter"}, status=HTTPStatus.BAD_REQUEST)
        limit = max(1, min(ADMIN_MAX_LIMIT, limit))

        q = str(params.get("q", [""])[0]).strip()
        email = str(params.get("email", [""])[0]).strip()
        try:
            messages, total = self._read_contact_records(limit=limit, q=q, email=email)
        except sqlite3.Error as exc:
            return self._send_json({"ok": False, "error": f"Unable to read messages: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

        return self._send_json(
            {
                "ok": True,
                "messages": messages,
                "count": len(messages),
                "total": total,
                "limit": limit,
                "filters": {"q": q, "email": email},
                "contact_store": str(CONTACT_DB_FILE.relative_to(ROOT)),
            }
        )

    def _handle_admin_delete(self):
        if not self._authorize_admin_api():
            return

        try:
            payload = self._read_json_body()
        except ValueError as exc:
            return self._send_json({"ok": False, "error": str(exc)}, status=HTTPStatus.BAD_REQUEST)

        raw_ids = payload.get("ids", [])
        if not isinstance(raw_ids, list):
            return self._send_json({"ok": False, "error": "ids must be an array"}, status=HTTPStatus.BAD_REQUEST)

        ids_to_delete = [str(item).strip() for item in raw_ids if str(item).strip()]
        ids_to_delete = list(dict.fromkeys(ids_to_delete))
        if not ids_to_delete:
            return self._send_json({"ok": False, "error": "Select at least one message to delete"}, status=HTTPStatus.BAD_REQUEST)

        try:
            delete_result = self._delete_contact_records(ids_to_delete)
        except sqlite3.Error as exc:
            return self._send_json({"ok": False, "error": f"Unable to update contact store: {exc}"}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

        return self._send_json({"ok": True, **delete_result})

    def _read_json_body(self, *, max_body_bytes: int = MAX_BODY_BYTES):
        raw_length = self.headers.get("Content-Length", "0")
        try:
            content_length = int(raw_length)
        except ValueError as exc:
            raise ValueError("Invalid Content-Length header") from exc

        if content_length <= 0:
            raise ValueError("Request body is empty")
        if content_length > max_body_bytes:
            raise ValueError("Request body is too large")

        raw_body = self.rfile.read(content_length)
        try:
            data = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("Request body must be valid JSON") from exc

        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object")
        return data

    def _check_contact_rate_limit(self) -> dict:
        if not RATE_LIMIT_CONFIG["enabled"]:
            return {"limited": False, "remaining": None, "retry_after_seconds": 0}

        key = self._client_ip()
        now = time.monotonic()
        window_seconds = RATE_LIMIT_CONFIG["window_seconds"]
        max_requests = RATE_LIMIT_CONFIG["max_requests"]
        cutoff = now - window_seconds

        with RATE_LIMIT_LOCK:
            bucket = RATE_LIMIT_BUCKETS[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= max_requests:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return {"limited": True, "remaining": 0, "retry_after_seconds": retry_after}

            bucket.append(now)
            remaining = max(0, max_requests - len(bucket))
            return {"limited": False, "remaining": remaining, "retry_after_seconds": 0}

    def _honeypot_triggered(self, payload: dict) -> bool:
        trap_value = payload.get(HONEYPOT_FIELD_NAME, "")
        return bool(str(trap_value).strip())

    def _validate_contact_payload(self, payload):
        name = str(payload.get("name", "")).strip()
        email = str(payload.get("email", "")).strip()
        message = str(payload.get("message", "")).strip()
        source = str(payload.get("source", "")).strip()

        if not name:
            raise ValueError("Name is required")
        if not email or "@" not in email:
            raise ValueError("A valid email is required")
        if not message:
            raise ValueError("Message is required")
        if len(name) > 120:
            raise ValueError("Name is too long")
        if len(email) > 200:
            raise ValueError("Email is too long")
        if len(message) > 5000:
            raise ValueError("Message is too long")

        return {
            "id": uuid4().hex,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "name": name,
            "email": email,
            "message": message,
            "source": source,
            "remote_addr": self.client_address[0] if self.client_address else None,
            "user_agent": self.headers.get("User-Agent", ""),
        }

    def _save_contact_record(self, record):
        with CONTACT_DB_LOCK:
            with _new_sqlite_connection() as conn:
                _insert_contact_record(conn, record)
                conn.commit()

    def _read_contact_records(self, *, limit: int, q: str = "", email: str = "") -> tuple[list[dict], int]:
        where_clauses: list[str] = []
        params: list[str] = []
        if q:
            pattern = f"%{q.lower()}%"
            where_clauses.append("(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(message) LIKE ? OR LOWER(COALESCE(source,'')) LIKE ?)")
            params.extend([pattern, pattern, pattern, pattern])
        if email:
            pattern = f"%{email.lower()}%"
            where_clauses.append("LOWER(email) LIKE ?")
            params.append(pattern)
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        with CONTACT_DB_LOCK:
            with _new_sqlite_connection() as conn:
                total = int(conn.execute(f"SELECT COUNT(*) FROM contact_messages {where_sql}", params).fetchone()[0])
                rows = conn.execute(
                    f"SELECT id, received_at, name, email, message, source, remote_addr, user_agent FROM contact_messages {where_sql} ORDER BY received_at DESC, rowid DESC LIMIT ?",
                    [*params, limit],
                ).fetchall()

        records = []
        for row in rows:
            records.append(
                {
                    "id": str(row["id"]),
                    "received_at": row["received_at"],
                    "name": row["name"],
                    "email": row["email"],
                    "message": row["message"],
                    "source": row["source"],
                    "remote_addr": row["remote_addr"],
                    "user_agent": row["user_agent"],
                    "parse_error": False,
                }
            )
        return records, total

    def _delete_contact_records(self, ids_to_delete: list[str]) -> dict:
        placeholders = ",".join(["?"] * len(ids_to_delete))
        with CONTACT_DB_LOCK:
            with _new_sqlite_connection() as conn:
                cur = conn.execute(f"DELETE FROM contact_messages WHERE id IN ({placeholders})", ids_to_delete)
                deleted = int(cur.rowcount)
                remaining = int(conn.execute("SELECT COUNT(*) FROM contact_messages").fetchone()[0])
                conn.commit()
        return {
            "deleted": deleted,
            "requested": len(ids_to_delete),
            "remaining": remaining,
            "contact_store": str(CONTACT_DB_FILE.relative_to(ROOT)),
        }

    def _send_contact_email(self, record):
        if not SMTP_CONFIG:
            return {
                "email_configured": False,
                "email_sent": False,
                "email_status": SMTP_STATUS.get("reason", "not configured"),
                "email_provider": SMTP_STATUS.get("provider"),
                "email_recipients": SMTP_STATUS.get("recipients", []),
            }

        message = EmailMessage()
        message["Subject"] = f"Portfolio contact: {record['name']}"
        message["From"] = SMTP_CONFIG["sender"]
        message["To"] = ", ".join(SMTP_CONFIG["recipients"])
        message["Reply-To"] = record["email"]
        message.set_content(
            "\n".join(
                [
                    "New portfolio contact message",
                    "",
                    f"Name: {record['name']}",
                    f"Email: {record['email']}",
                    f"Received (UTC): {record['received_at']}",
                    f"Source: {record.get('source') or 'n/a'}",
                    f"Remote IP: {record.get('remote_addr') or 'n/a'}",
                    "",
                    "Message:",
                    record["message"],
                ]
            )
        )

        try:
            if SMTP_CONFIG["use_ssl"]:
                with smtplib.SMTP_SSL(
                    SMTP_CONFIG["host"],
                    SMTP_CONFIG["port"],
                    timeout=SMTP_TIMEOUT_SECONDS,
                    context=ssl.create_default_context(),
                ) as client:
                    self._smtp_send(client, message)
            else:
                with smtplib.SMTP(SMTP_CONFIG["host"], SMTP_CONFIG["port"], timeout=SMTP_TIMEOUT_SECONDS) as client:
                    self._smtp_send(client, message)
        except (OSError, smtplib.SMTPException, ssl.SSLError) as exc:
            return {
                "email_configured": True,
                "email_sent": False,
                "email_status": "send_failed",
                "email_provider": SMTP_CONFIG.get("provider"),
                "email_recipients": SMTP_CONFIG["recipients"],
                "email_error": str(exc),
            }

        return {
            "email_configured": True,
            "email_sent": True,
            "email_status": "sent",
            "email_provider": SMTP_CONFIG.get("provider"),
            "email_recipients": SMTP_CONFIG["recipients"],
        }

    def _smtp_send(self, client, message):
        client.ehlo()
        if SMTP_CONFIG["use_starttls"]:
            client.starttls(context=ssl.create_default_context())
            client.ehlo()
        if SMTP_CONFIG["username"] and SMTP_CONFIG["password"]:
            client.login(SMTP_CONFIG["username"], SMTP_CONFIG["password"])
        client.send_message(message)

    def _authorize_admin_api(self) -> bool:
        if ADMIN_CONFIG.get("require_token") and not ADMIN_CONFIG.get("token"):
            self._send_json(
                {
                    "ok": False,
                    "error": "Admin API disabled: token is required but PORTFOLIO_ADMIN_TOKEN is not configured.",
                },
                status=HTTPStatus.SERVICE_UNAVAILABLE,
            )
            return False

        if ADMIN_CONFIG["token"]:
            provided = self.headers.get("X-Admin-Token", "").strip()
            if provided and hmac.compare_digest(provided, str(ADMIN_CONFIG["token"])):
                return True
            session_id = self._extract_cookie_value(ADMIN_SESSION_COOKIE_NAME)
            if session_id and _validate_admin_session_id(session_id):
                return True
            self._send_json(
                {"ok": False, "error": "Unauthorized admin request. Log in or provide X-Admin-Token."},
                status=HTTPStatus.UNAUTHORIZED,
            )
            return False

        if self._is_loopback_client():
            return True

        self._send_json(
            {
                "ok": False,
                "error": "Admin API is localhost-only unless PORTFOLIO_ADMIN_TOKEN is configured.",
            },
            status=HTTPStatus.FORBIDDEN,
        )
        return False

    def _extract_cookie_value(self, name: str) -> str:
        raw = self.headers.get("Cookie", "")
        if not raw:
            return ""
        cookie = SimpleCookie()
        try:
            cookie.load(raw)
        except CookieError:
            return ""
        morsel = cookie.get(name)
        return morsel.value if morsel else ""
    def _is_loopback_client(self) -> bool:
        ip = self._client_ip()
        return ip in {"127.0.0.1", "::1"} or ip.startswith("::ffff:127.")

    def _client_ip(self) -> str:
        if self.client_address and len(self.client_address) > 0:
            return str(self.client_address[0])
        return "unknown"

    @staticmethod
    def _record_id_from_line(line_number: int, raw_line: str) -> str:
        digest = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()[:12]
        return f"line-{line_number}-{digest}"

    def _send_json(self, payload, status=HTTPStatus.OK, extra_headers: dict[str, str] | None = None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(str(key), str(value))
        self.end_headers()
        self.wfile.write(body)

    def _send_svg(self, svg_text: str, status=HTTPStatus.OK, extra_headers: dict[str, str] | None = None):
        body = svg_text.encode("utf-8")
        self.send_response(int(status))
        self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(str(key), str(value))
        self.end_headers()
        self.wfile.write(body)

    def _send_png(self, png_bytes: bytes, status=HTTPStatus.OK, extra_headers: dict[str, str] | None = None):
        body = bytes(png_bytes)
        self.send_response(int(status))
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(str(key), str(value))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Keep console output concise during local demos.
        super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description="Serve the portfolio with a local Python contact API")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind (default: 8000)")
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    migration = init_contact_store()

    server = ThreadingHTTPServer((args.host, args.port), PortfolioHandler)
    print(f"Serving {ROOT} at http://{args.host}:{args.port}")
    print(f"Contact submissions (SQLite) will be saved to {CONTACT_DB_FILE}")
    print(f"Legacy JSONL path: {CONTACT_JSONL_FILE}")
    print(f"Projects API source: {PROJECTS_FILE}")
    if migration.get("legacy_exists"):
        print(f"Legacy JSONL migration -> migrated={migration.get('migrated')}, skipped={migration.get('skipped')}")
    print(f"Admin panel: {ADMIN_STATUS['ui_path']} ({ADMIN_STATUS['reason']})")
    if SMTP_STATUS.get("enabled"):
        provider_label = SMTP_STATUS.get("provider") or "custom"
        print(
            "SMTP email notifications enabled -> "
            f"provider={provider_label}, to={', '.join(SMTP_STATUS.get('recipients', []))}, "
            f"via {SMTP_STATUS.get('host')}:{SMTP_STATUS.get('port')}"
        )
    else:
        print(f"SMTP email notifications disabled ({SMTP_STATUS.get('reason')})")
    if RATE_LIMIT_CONFIG["enabled"]:
        print(
            "Spam protection enabled -> "
            f"honeypot={HONEYPOT_FIELD_NAME}, rate_limit={RATE_LIMIT_CONFIG['max_requests']} per {RATE_LIMIT_CONFIG['window_seconds']}s"
        )
    else:
        print(f"Spam protection -> honeypot={HONEYPOT_FIELD_NAME}, rate_limit=disabled")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
