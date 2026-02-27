from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from contextlib import contextmanager
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _request(method: str, url: str, *, headers: dict[str, str] | None = None):
    req = urllib.request.Request(url=url, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8", errors="replace")
            return int(response.status), {k.lower(): v for k, v in response.headers.items()}, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), {k.lower(): v for k, v in exc.headers.items()}, body


def _wait_for_health(base_url: str, timeout_sec: float = 15.0) -> None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            status, _, body = _request("GET", f"{base_url}/api/health")
            if status == 200 and json.loads(body).get("ok") is True:
                return
        except Exception:
            pass
        time.sleep(0.25)
    raise RuntimeError("server did not become healthy in time")


@contextmanager
def run_server(extra_env: dict[str, str] | None = None):
    port = _free_port()
    base_url = f"http://127.0.0.1:{port}"

    env = os.environ.copy()
    env["PORTFOLIO_CONTACT_RATE_LIMIT_MAX_REQUESTS"] = "50"
    if extra_env:
        env.update(extra_env)

    process = subprocess.Popen(
        [sys.executable, "server.py", "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        _wait_for_health(base_url)
        yield base_url
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def test_security_headers_present_for_html_and_static() -> None:
    with run_server({"PORTFOLIO_ENABLE_HSTS": "false"}) as base_url:
        status, headers, _ = _request("GET", f"{base_url}/")
        assert status == 200
        for header_name in (
            "x-content-type-options",
            "x-frame-options",
            "referrer-policy",
            "permissions-policy",
            "cross-origin-opener-policy",
            "cross-origin-resource-policy",
            "content-security-policy",
        ):
            assert headers.get(header_name)

        assert "strict-transport-security" not in headers

        status_css, css_headers, _ = _request("GET", f"{base_url}/styles.css")
        assert status_css == 200
        assert css_headers.get("cache-control")


def test_hsts_when_enabled_and_forwarded_https() -> None:
    with run_server({"PORTFOLIO_ENABLE_HSTS": "true"}) as base_url:
        status, headers, _ = _request(
            "GET",
            f"{base_url}/",
            headers={"X-Forwarded-Proto": "https"},
        )
        assert status == 200
        assert headers.get("strict-transport-security", "").startswith("max-age=")
