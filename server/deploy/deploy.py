#!/usr/bin/env python3
"""RAL Finance API deploy helper (paramiko, password auth, IPv6 fallback).

Usage (from the Finances repo root):
  python server/deploy/deploy.py deploy            upload app + compose + scripts, rebuild and restart the API
  python server/deploy/deploy.py run "<cmd>"       run a command on the VPS
  python server/deploy/deploy.py put LOCAL REMOTE  upload one file

Creds come from env (VPS_HOST, VPS_USER, VPS_PASS, optional VPS_HOST6, VPS_PORT), else from the
gitignored Finances/.vps-creds. Never prints secrets.
"""
import io
import os
import sys
import tarfile
from pathlib import Path

import paramiko

ROOT = Path(__file__).resolve().parents[2]
SERVER = ROOT / "server"
REMOTE = "/opt/ral-finance"


def creds() -> dict:
    c = {}
    f = ROOT / ".vps-creds"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                c[k.strip()] = v.strip()
    for k in ("VPS_HOST", "VPS_HOST6", "VPS_USER", "VPS_PASS", "VPS_PORT"):
        if os.environ.get(k):
            c[k] = os.environ[k]
    return c


def connect() -> paramiko.SSHClient:
    c = creds()
    hosts = [h for h in (c.get("VPS_HOST"), c.get("VPS_HOST6")) if h]
    last = None
    for i, h in enumerate(hosts):
        cl = paramiko.SSHClient()
        cl.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            cl.connect(h, port=int(c.get("VPS_PORT", 22)), username=c["VPS_USER"], password=c["VPS_PASS"],
                       allow_agent=False, look_for_keys=False, timeout=8 if i == 0 and len(hosts) > 1 else 20,
                       banner_timeout=20, auth_timeout=20)
            return cl
        except Exception as e:  # noqa: BLE001
            last = e
    raise SystemExit(f"connect failed: {type(last).__name__}")


def run(cl: paramiko.SSHClient, cmd: str) -> int:
    ch = cl.get_transport().open_session()
    ch.set_combine_stderr(True)
    ch.exec_command(cmd)
    f = ch.makefile("rb")
    for line in iter(f.readline, b""):
        sys.stdout.write(line.decode("utf-8", "replace"))
    return ch.recv_exit_status()


def put(cl: paramiko.SSHClient, local: str, remote: str) -> None:
    sftp = cl.open_sftp()
    sftp.put(local, remote)
    sftp.close()


def deploy(cl: paramiko.SSHClient) -> int:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in ("package.json", "package-lock.json", "server.js", "Dockerfile", ".dockerignore"):
            tar.add(SERVER / name, arcname=f"app/{name}")
        for name in ("docker-compose.yml", "backup.sh", "load.sh"):
            tar.add(SERVER / "deploy" / name, arcname=name)
    buf.seek(0)
    sftp = cl.open_sftp()
    sftp.putfo(buf, "/tmp/ral-finance-deploy.tgz")
    sftp.close()
    return run(cl, f"set -e; mkdir -p {REMOTE}/app {REMOTE}/incoming {REMOTE}/backups; "
                   f"tar xzf /tmp/ral-finance-deploy.tgz -C {REMOTE}; rm /tmp/ral-finance-deploy.tgz; "
                   f"chmod 700 {REMOTE}/backup.sh {REMOTE}/load.sh; cd {REMOTE}; "
                   "docker compose build -q api && docker compose up -d && docker compose ps")


def main(argv) -> int:
    if not argv:
        print(__doc__)
        return 2
    cl = connect()
    try:
        if argv[0] == "deploy":
            return deploy(cl)
        if argv[0] == "run":
            return run(cl, argv[1])
        if argv[0] == "put":
            put(cl, argv[1], argv[2])
            return 0
        print(__doc__)
        return 2
    finally:
        cl.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
