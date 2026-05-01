#!/usr/bin/env python3
"""
shadow-cli: Agent-usable CLI for Shadow Simulator
Generated via CLI-Anything methodology

Wraps the Shadow Simulator REST API into structured CLI commands
for directories, models, uploads, and AI building analysis.
"""

import argparse
import json
import sys
import os
import base64
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

BASE_URL = os.environ.get("SHADOW_API_URL", "http://localhost:3002")


# ─── HTTP helpers ──────────────────────────────────────────

def _request(method: str, path: str, data: dict | None = None, raw_body: bytes | None = None, content_type: str | None = None) -> dict:
    url = f"{BASE_URL}{path}"
    headers = {}
    body = None

    if raw_body is not None:
        body = raw_body
        if content_type:
            headers["Content-Type"] = content_type
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"

    req = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as e:
        err_body = e.read().decode()
        try:
            err = json.loads(err_body)
        except Exception:
            err = {"error": err_body}
        print(json.dumps({"status": "error", "code": e.code, **err}), file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(json.dumps({"status": "error", "message": str(e.reason)}), file=sys.stderr)
        sys.exit(1)


def _get(path: str) -> dict:
    return _request("GET", path)


def _post(path: str, data: dict | None = None) -> dict:
    return _request("POST", path, data)


def _put(path: str, data: dict | None = None) -> dict:
    return _request("PUT", path, data)


def _delete(path: str) -> dict:
    return _request("DELETE", path)


def _out(data):
    print(json.dumps(data, ensure_ascii=False, indent=2))


# ─── Health ────────────────────────────────────────────────

def cmd_health(_args):
    """Check API health status."""
    _out(_get("/api/health"))


# ─── Directories ───────────────────────────────────────────

def cmd_dir_list(_args):
    """List all directories."""
    _out(_get("/api/directories"))


def cmd_dir_create(args):
    """Create a new directory."""
    payload = {"name": args.name}
    if args.description:
        payload["description"] = args.description
    if args.sort_order is not None:
        payload["sort_order"] = args.sort_order
    _out(_post("/api/directories", payload))


def cmd_dir_update(args):
    """Update a directory."""
    payload = {}
    if args.name:
        payload["name"] = args.name
    if args.description:
        payload["description"] = args.description
    if args.sort_order is not None:
        payload["sort_order"] = args.sort_order
    _out(_put(f"/api/directories/{args.id}", payload))


def cmd_dir_delete(args):
    """Delete a directory (cascades to models)."""
    _out(_delete(f"/api/directories/{args.id}"))


def cmd_dir_copy(args):
    """Copy a directory with all its models."""
    _out(_post(f"/api/directories/{args.id}/copy"))


# ─── Models ────────────────────────────────────────────────

def cmd_model_list(args):
    """List models in a directory."""
    _out(_get(f"/api/directories/{args.dir_id}/models"))


def cmd_model_get(args):
    """Get a single model by ID."""
    _out(_get(f"/api/models/{args.id}"))


def cmd_model_create(args):
    """Create a new model in a directory."""
    payload = {"name": args.name}
    if args.description:
        payload["description"] = args.description
    if args.lat is not None:
        payload["location_lat"] = args.lat
    if args.lng is not None:
        payload["location_lng"] = args.lng
    if args.city:
        payload["city_name"] = args.city
    if args.date_time:
        payload["date_time"] = args.date_time
    if args.scene_data:
        payload["scene_data"] = json.loads(args.scene_data)
    if args.sort_order is not None:
        payload["sort_order"] = args.sort_order
    _out(_post(f"/api/directories/{args.dir_id}/models", payload))


def cmd_model_update(args):
    """Update a model."""
    payload = {}
    if args.name:
        payload["name"] = args.name
    if args.description:
        payload["description"] = args.description
    if args.lat is not None:
        payload["location_lat"] = args.lat
    if args.lng is not None:
        payload["location_lng"] = args.lng
    if args.city:
        payload["city_name"] = args.city
    if args.date_time:
        payload["date_time"] = args.date_time
    if args.scene_data:
        payload["scene_data"] = json.loads(args.scene_data)
    if args.sort_order is not None:
        payload["sort_order"] = args.sort_order
    _out(_put(f"/api/models/{args.id}", payload))


def cmd_model_delete(args):
    """Delete a model."""
    _out(_delete(f"/api/models/{args.id}"))


def cmd_model_copy(args):
    """Copy a model, optionally to another directory."""
    payload = {}
    if args.target_dir:
        payload["target_directory_id"] = args.target_dir
    _out(_post(f"/api/models/{args.id}/copy", payload))


def cmd_model_move(args):
    """Move a model to another directory."""
    _out(_put(f"/api/models/{args.id}/move", {"target_directory_id": args.target_dir}))


# ─── Uploads ───────────────────────────────────────────────

def cmd_upload_glb(args):
    """Upload a GLB/GLTF file."""
    filepath = args.file
    if not os.path.isfile(filepath):
        print(json.dumps({"status": "error", "message": f"File not found: {filepath}"}), file=sys.stderr)
        sys.exit(1)

    filename = os.path.basename(filepath)
    boundary = "----ShadowCLIBoundary"
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
    body.extend(b"Content-Type: model/gltf-binary\r\n\r\n")
    with open(filepath, "rb") as f:
        body.extend(f.read())
    body.extend(f"\r\n--{boundary}--\r\n".encode())

    _out(_request("POST", "/api/upload/glb", raw_body=bytes(body),
                  content_type=f"multipart/form-data; boundary={boundary}"))


def cmd_upload_delete(args):
    """Delete an uploaded GLB file."""
    _out(_delete(f"/api/uploads/glb/{args.filename}"))


# ─── AI ────────────────────────────────────────────────────

def cmd_ai_analyze(args):
    """Analyze a building image with AI, return structured params."""
    filepath = args.image
    if not os.path.isfile(filepath):
        print(json.dumps({"status": "error", "message": f"File not found: {filepath}"}), file=sys.stderr)
        sys.exit(1)

    with open(filepath, "rb") as f:
        raw = f.read()

    ext = os.path.splitext(filepath)[1].lower()
    mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
    mime = mime_map.get(ext, "image/jpeg")
    b64 = f"data:{mime};base64,{base64.b64encode(raw).decode()}"

    _out(_post("/api/ai/analyze-building", {"image": b64}))


# ─── CLI parser ────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(
        prog="shadow-cli",
        description="Agent-usable CLI for Shadow Simulator",
    )
    parser.add_argument("--api-url", help="Override API base URL (default: $SHADOW_API_URL or http://localhost:3002)")
    sub = parser.add_subparsers(dest="command", required=True)

    # health
    sub.add_parser("health", help="Check API health")

    # dir list
    sub.add_parser("dir-list", help="List all directories")

    # dir create
    p = sub.add_parser("dir-create", help="Create a directory")
    p.add_argument("name", help="Directory name")
    p.add_argument("--description", "-d", help="Description")
    p.add_argument("--sort-order", type=int, help="Sort order")

    # dir update
    p = sub.add_parser("dir-update", help="Update a directory")
    p.add_argument("id", help="Directory ID")
    p.add_argument("--name", "-n", help="New name")
    p.add_argument("--description", "-d", help="New description")
    p.add_argument("--sort-order", type=int, help="New sort order")

    # dir delete
    p = sub.add_parser("dir-delete", help="Delete a directory")
    p.add_argument("id", help="Directory ID")

    # dir copy
    p = sub.add_parser("dir-copy", help="Copy a directory with models")
    p.add_argument("id", help="Directory ID to copy")

    # model list
    p = sub.add_parser("model-list", help="List models in a directory")
    p.add_argument("dir_id", help="Directory ID")

    # model get
    p = sub.add_parser("model-get", help="Get a model by ID")
    p.add_argument("id", help="Model ID")

    # model create
    p = sub.add_parser("model-create", help="Create a model")
    p.add_argument("dir_id", help="Directory ID")
    p.add_argument("name", help="Model name")
    p.add_argument("--description", "-d", help="Description")
    p.add_argument("--lat", type=float, help="Latitude")
    p.add_argument("--lng", type=float, help="Longitude")
    p.add_argument("--city", help="City name")
    p.add_argument("--date-time", help="Date/time (ISO 8601)")
    p.add_argument("--scene-data", help="Scene data as JSON string")
    p.add_argument("--sort-order", type=int, help="Sort order")

    # model update
    p = sub.add_parser("model-update", help="Update a model")
    p.add_argument("id", help="Model ID")
    p.add_argument("--name", "-n", help="New name")
    p.add_argument("--description", "-d", help="New description")
    p.add_argument("--lat", type=float, help="Latitude")
    p.add_argument("--lng", type=float, help="Longitude")
    p.add_argument("--city", help="City name")
    p.add_argument("--date-time", help="Date/time")
    p.add_argument("--scene-data", help="Scene data as JSON string")
    p.add_argument("--sort-order", type=int, help="Sort order")

    # model delete
    p = sub.add_parser("model-delete", help="Delete a model")
    p.add_argument("id", help="Model ID")

    # model copy
    p = sub.add_parser("model-copy", help="Copy a model")
    p.add_argument("id", help="Model ID")
    p.add_argument("--target-dir", help="Target directory ID (default: same)")

    # model move
    p = sub.add_parser("model-move", help="Move a model to another directory")
    p.add_argument("id", help="Model ID")
    p.add_argument("target_dir", help="Target directory ID")

    # upload glb
    p = sub.add_parser("upload-glb", help="Upload a GLB/GLTF file")
    p.add_argument("file", help="Path to GLB/GLTF file")

    # upload delete
    p = sub.add_parser("upload-delete", help="Delete an uploaded GLB file")
    p.add_argument("filename", help="Filename to delete")

    # ai analyze
    p = sub.add_parser("ai-analyze", help="Analyze building image with AI")
    p.add_argument("image", help="Path to building image file")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.api_url:
        global BASE_URL
        BASE_URL = args.api_url.rstrip("/")

    dispatch = {
        "health": cmd_health,
        "dir-list": cmd_dir_list,
        "dir-create": cmd_dir_create,
        "dir-update": cmd_dir_update,
        "dir-delete": cmd_dir_delete,
        "dir-copy": cmd_dir_copy,
        "model-list": cmd_model_list,
        "model-get": cmd_model_get,
        "model-create": cmd_model_create,
        "model-update": cmd_model_update,
        "model-delete": cmd_model_delete,
        "model-copy": cmd_model_copy,
        "model-move": cmd_model_move,
        "upload-glb": cmd_upload_glb,
        "upload-delete": cmd_upload_delete,
        "ai-analyze": cmd_ai_analyze,
    }

    handler = dispatch.get(args.command)
    if handler:
        handler(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
