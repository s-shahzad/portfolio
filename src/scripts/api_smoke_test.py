from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


class CheckFailure(RuntimeError):
    pass


def _ensure(condition: bool, message: str) -> None:
    if not condition:
        raise CheckFailure(message)


def _request(method: str, url: str, payload: dict | None = None, timeout: float = 5.0):
    data = None
    headers = {"Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url=url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            return int(resp.status), {k.lower(): v for k, v in resp.headers.items()}, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), {k.lower(): v for k, v in exc.headers.items()}, body


def _decode_json(body: str, context: str) -> dict:
    try:
        value = json.loads(body)
    except json.JSONDecodeError as exc:
        raise CheckFailure(f"{context}: expected JSON but got invalid payload ({exc})") from exc
    if not isinstance(value, dict):
        raise CheckFailure(f"{context}: expected JSON object")
    return value


def _wait_for_health(base_url: str, timeout_sec: float) -> dict:
    deadline = time.time() + timeout_sec
    last_error = "unknown"
    while time.time() < deadline:
        try:
            status, _, body = _request("GET", f"{base_url}/api/health", timeout=2.0)
            if status == 200:
                payload = _decode_json(body, "health")
                _ensure(payload.get("ok") is True, "health: ok must be true")
                return payload
            last_error = f"HTTP {status}"
        except OSError as exc:
            last_error = str(exc)
        time.sleep(0.25)
    raise CheckFailure(f"health endpoint did not become ready within {timeout_sec:.1f}s ({last_error})")


def _check_security_headers(base_url: str) -> None:
    status, headers, _ = _request("GET", f"{base_url}/")
    _ensure(status == 200, f"GET / expected 200, got {status}")

    required_headers = [
        "x-content-type-options",
        "x-frame-options",
        "referrer-policy",
        "permissions-policy",
        "cross-origin-opener-policy",
        "cross-origin-resource-policy",
        "content-security-policy",
    ]
    for header_name in required_headers:
        _ensure(headers.get(header_name), f"GET / missing security header: {header_name}")

    status, headers, _ = _request("GET", f"{base_url}/styles.css")
    _ensure(status == 200, f"GET /styles.css expected 200, got {status}")
    cache_control = headers.get("cache-control", "")
    _ensure(cache_control != "", "GET /styles.css missing Cache-Control header")


def _check_ioc_extract(base_url: str) -> None:
    sample_text = "Ping 8.8.8.8 and visit https://example.com from test.local"
    status, _, body = _request("POST", f"{base_url}/api/cyber/ioc/extract", payload={"text": sample_text})
    _ensure(status == 200, f"IOC extract expected 200, got {status}")
    payload = _decode_json(body, "ioc")
    _ensure(payload.get("ok") is True, "ioc: ok must be true")

    ipv4_entries = payload.get("ipv4")
    _ensure(isinstance(ipv4_entries, list) and len(ipv4_entries) > 0, "ioc: ipv4 list missing or empty")
    first_ip = ipv4_entries[0]
    _ensure(isinstance(first_ip, dict), "ioc: ipv4 entry must be an object")
    _ensure("value" in first_ip and "classification" in first_ip, "ioc: ipv4 entry missing expected fields")


def _check_admin_routes(base_url: str, admin_mode: str) -> None:
    if admin_mode == "localhost_only":
        expected_status = 200
    elif admin_mode in {"token", "token_hash"}:
        expected_status = 401
    elif admin_mode == "token_required_not_configured":
        expected_status = 503
    else:
        raise CheckFailure(f"health: unexpected admin mode '{admin_mode}'")

    status, _, body = _request("GET", f"{base_url}/api/admin/messages")
    _ensure(status == expected_status, f"admin messages expected {expected_status}, got {status}")

    if expected_status != 200:
        payload = _decode_json(body, "admin messages error")
        _ensure(payload.get("ok") is False, "admin error payload should have ok=false")

    status_svg, headers_svg, _ = _request("GET", f"{base_url}/api/admin/contact-trend.svg")
    _ensure(status_svg == expected_status, f"admin trend.svg expected {expected_status}, got {status_svg}")
    if expected_status == 200:
        _ensure("image/svg+xml" in headers_svg.get("content-type", ""), "admin trend.svg content-type mismatch")

    status_png, headers_png, _ = _request("GET", f"{base_url}/api/admin/contact-trend.png")
    _ensure(status_png == expected_status, f"admin trend.png expected {expected_status}, got {status_png}")
    if expected_status == 200:
        _ensure("image/png" in headers_png.get("content-type", ""), "admin trend.png content-type mismatch")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run portfolio API smoke checks against a temporary local server.")
    parser.add_argument("--bind-host", default="127.0.0.1", help="Host for the temporary server bind")
    parser.add_argument("--port", type=int, default=8123, help="Port for the temporary server")
    parser.add_argument("--timeout", type=float, default=20.0, help="Server startup timeout in seconds")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    base_url = f"http://127.0.0.1:{args.port}"
    command = [sys.executable, "src/server.py", "--host", args.bind_host, "--port", str(args.port)]

    process = subprocess.Popen(
        command,
        cwd=repo_root,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    try:
        health_payload = _wait_for_health(base_url, args.timeout)
        _check_security_headers(base_url)
        _check_ioc_extract(base_url)
        admin_mode = str(health_payload.get("admin_panel", {}).get("mode", ""))
        _check_admin_routes(base_url, admin_mode)
    except CheckFailure as exc:
        print(f"[FAIL] {exc}")
        return 1
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)

    print("[PASS] API smoke checks completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

