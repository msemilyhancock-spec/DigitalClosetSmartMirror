#!/usr/bin/env python3
"""
Wardrobe Catalog Server for Magic Mirror (Orange Pi)

A lightweight local server that stores full-quality wardrobe photos
on the Orange Pi's filesystem and serves them to the mirror's browser.

Usage:
    python3 wardrobe_server.py

Runs on port 3456 by default. Photos are saved to ~/wardrobe/<category>/
The mirror's browser POSTs base64 images here and GETs them back for display.

Requirements: Python 3.7+ (no external packages needed)
"""

import os
import json
import base64
import uuid
import http.server
import socketserver
from datetime import datetime
from pathlib import Path

PORT = 3456
WARDROBE_DIR = Path.home() / "wardrobe"

# Ensure category directories exist
CATEGORIES = ["tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"]
for cat in CATEGORIES:
    (WARDROBE_DIR / cat).mkdir(parents=True, exist_ok=True)


class WardrobeHandler(http.server.BaseHTTPRequestHandler):
    """Handles upload, serve, delete, and ping requests from the mirror."""

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = self.path

        # Health check
        if path == "/ping":
            self.send_response(200)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            count = sum(len(list((WARDROBE_DIR / c).glob("*.jpg"))) for c in CATEGORIES)
            self.wfile.write(json.dumps({
                "status": "ok",
                "items": count,
                "storage": str(WARDROBE_DIR)
            }).encode())
            return

        # Serve wardrobe images: /wardrobe/<category>/<filename>
        if path.startswith("/wardrobe/"):
            parts = path[len("/wardrobe/"):].split("/", 1)
            if len(parts) == 2:
                category, filename = parts
                # Sanitize
                if category in CATEGORIES and ".." not in filename:
                    filepath = WARDROBE_DIR / category / filename
                    if filepath.exists():
                        self.send_response(200)
                        self._cors_headers()
                        self.send_header("Content-Type", "image/jpeg")
                        self.send_header("Cache-Control", "public, max-age=86400")
                        self.end_headers()
                        with open(filepath, "rb") as f:
                            self.wfile.write(f.read())
                        return

        # List all items: /list
        if path == "/list":
            items = []
            for cat in CATEGORIES:
                cat_dir = WARDROBE_DIR / cat
                for f in sorted(cat_dir.glob("*.jpg")):
                    stat = f.stat()
                    items.append({
                        "category": cat,
                        "filename": f.name,
                        "date": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "size": stat.st_size,
                    })
            self.send_response(200)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"items": items, "total": len(items)}).encode())
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        # Upload image
        if self.path == "/upload":
            try:
                data = json.loads(body)
                image_data = data.get("image", "")
                category = data.get("category", "")

                if category not in CATEGORIES:
                    raise ValueError(f"Invalid category: {category}")

                # Strip data URL prefix
                if "," in image_data:
                    image_data = image_data.split(",", 1)[1]

                image_bytes = base64.b64decode(image_data)

                # Generate unique filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{timestamp}_{uuid.uuid4().hex[:6]}.jpg"
                filepath = WARDROBE_DIR / category / filename

                with open(filepath, "wb") as f:
                    f.write(image_bytes)

                self.send_response(200)
                self._cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({
                    "filename": filename,
                    "category": category,
                    "size": len(image_bytes),
                    "path": str(filepath),
                }).encode())
                print(f"  Saved: {category}/{filename} ({len(image_bytes)} bytes)")

            except Exception as e:
                self.send_response(500)
                self._cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # Delete image
        if self.path == "/delete":
            try:
                data = json.loads(body)
                category = data.get("category", "")
                filename = data.get("filename", "")

                if category not in CATEGORIES or ".." in filename:
                    raise ValueError("Invalid category or filename")

                filepath = WARDROBE_DIR / category / filename
                if filepath.exists():
                    filepath.unlink()
                    print(f"  Deleted: {category}/{filename}")

                self.send_response(200)
                self._cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"deleted": True}).encode())

            except Exception as e:
                self.send_response(500)
                self._cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        """Cleaner logging."""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]}")


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    print(f"""
╔══════════════════════════════════════════════╗
║   Magic Mirror — Wardrobe Catalog Server     ║
║   Port: {PORT}                                 ║
║   Storage: {WARDROBE_DIR}  ║
╚══════════════════════════════════════════════╝
""")
    # Count existing items
    total = sum(len(list((WARDROBE_DIR / c).glob("*.jpg"))) for c in CATEGORIES)
    if total > 0:
        print(f"  Found {total} existing wardrobe items")
        for cat in CATEGORIES:
            count = len(list((WARDROBE_DIR / cat).glob("*.jpg")))
            if count > 0:
                print(f"    {cat}: {count}")
    else:
        print("  Empty wardrobe — ready for first captures!")
    print()

    with ReusableTCPServer(("", PORT), WardrobeHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
