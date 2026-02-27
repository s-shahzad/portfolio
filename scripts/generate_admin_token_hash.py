from __future__ import annotations

import argparse
import json
import secrets
from hashlib import pbkdf2_hmac

PREFIX = "pbkdf2_sha256"
DEFAULT_ITERATIONS = 390000


def build_hash(token: str, iterations: int) -> str:
    salt = secrets.token_bytes(16)
    digest = pbkdf2_hmac("sha256", token.encode("utf-8"), salt, iterations)
    return f"{PREFIX}${iterations}${salt.hex()}${digest.hex()}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a secure admin token hash for PORTFOLIO_ADMIN_TOKEN_HASH")
    parser.add_argument("--token", default="", help="Optional existing plaintext token")
    parser.add_argument("--iterations", type=int, default=DEFAULT_ITERATIONS)
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    if args.iterations < 100000:
        raise SystemExit("iterations must be >= 100000")

    token = args.token.strip() or secrets.token_urlsafe(48)
    token_hash = build_hash(token, args.iterations)

    payload = {
        "token": token,
        "token_hash": token_hash,
        "iterations": args.iterations,
        "prefix": PREFIX,
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"TOKEN={token}")
        print(f"TOKEN_HASH={token_hash}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
