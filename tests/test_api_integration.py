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

import pytest


ROOT = Path(__file__).resolve().parents[1]


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _request(method: str, url: str, payload: dict | None = None, headers: dict[str, str] | None = None):
    req_headers = {"Accept": "application/json"}
    data = None

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    if headers:
        req_headers.update(headers)

    req = urllib.request.Request(url=url, method=method, data=data, headers=req_headers)
    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            body = response.read().decode("utf-8", errors="replace")
            status = int(response.status)
            return status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return int(exc.code), body


def _wait_for_health(base_url: str, timeout_sec: float = 15.0) -> None:
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            status, body = _request("GET", f"{base_url}/api/health")
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
    for key in list(env.keys()):
        if key.startswith("PORTFOLIO_SMTP_"):
            env.pop(key, None)

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
    except Exception:
        stdout, stderr = process.communicate(timeout=5)
        raise RuntimeError(f"server startup failed\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}")
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)


def test_ioc_extract_response_shape() -> None:
    with run_server() as base_url:
        status, body = _request(
            "POST",
            f"{base_url}/api/cyber/ioc/extract",
            payload={"text": "Investigate 8.8.8.8 and https://example.com quickly."},
        )
        assert status == 200
        payload = json.loads(body)
        assert payload["ok"] is True
        assert isinstance(payload["ipv4"], list)
        assert payload["ipv4"]
        assert {"value", "classification"}.issubset(payload["ipv4"][0].keys())


def test_contact_submit_created() -> None:
    with run_server() as base_url:
        status, body = _request(
            "POST",
            f"{base_url}/api/contact",
            payload={
                "name": "Integration Test",
                "email": "integration.test@example.com",
                "message": "Automated test contact submission",
                "source": "pytest",
            },
        )
        assert status == 201
        payload = json.loads(body)
        assert payload["ok"] is True
        assert payload["spam_blocked"] is False


def test_admin_localhost_mode_allows_access() -> None:
    with run_server({"PORTFOLIO_ADMIN_REQUIRE_TOKEN": "false", "PORTFOLIO_ADMIN_TOKEN": ""}) as base_url:
        status, body = _request("GET", f"{base_url}/api/admin/messages")
        assert status == 200
        payload = json.loads(body)
        assert payload["ok"] is True


def test_admin_token_mode_requires_auth() -> None:
    token = "pytest-admin-token"
    with run_server({"PORTFOLIO_ADMIN_REQUIRE_TOKEN": "true", "PORTFOLIO_ADMIN_TOKEN": token}) as base_url:
        status, body = _request("GET", f"{base_url}/api/admin/messages")
        assert status == 401
        payload = json.loads(body)
        assert payload["ok"] is False

        status_ok, body_ok = _request(
            "GET",
            f"{base_url}/api/admin/messages",
            headers={"X-Admin-Token": token},
        )
        assert status_ok == 200
        payload_ok = json.loads(body_ok)
        assert payload_ok["ok"] is True


def test_admin_token_required_without_value_is_unavailable() -> None:
    with run_server({"PORTFOLIO_ADMIN_REQUIRE_TOKEN": "true", "PORTFOLIO_ADMIN_TOKEN": ""}) as base_url:
        status, body = _request("GET", f"{base_url}/api/admin/messages")
        assert status == 503
        payload = json.loads(body)
        assert payload["ok"] is False
