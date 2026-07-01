#!/usr/bin/env python3
# Local dev server that ALWAYS sends no-cache headers. The stock
# `python -m http.server` sends none, so Safari/Chrome aggressively cache
# index.html and every .jsx — which meant reopening the app served stale code
# and none of the latest changes showed up. This makes every reopen fetch fresh.
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5050


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.TCPServer):
    allow_reuse_address = True


with Server(("127.0.0.1", PORT), NoCacheHandler) as httpd:
    print(f"Serving {PORT} with no-cache headers")
    httpd.serve_forever()
