#!/usr/bin/env python3
# Local dev server that ALWAYS sends no-cache headers. The stock
# `python -m http.server` sends none, so Safari/Chrome aggressively cache
# index.html and every .jsx — which meant reopening the app served stale code
# and none of the latest changes showed up. This makes every reopen fetch fresh.
#
# It also proxies /api/* to scripts/dev-api.mjs (node, port 8745), which runs the
# real api/*.js serverless handlers. Without that the dev preview has no /api at
# all and the auth gate on /api/complete can only be tested in production.
import http.client
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
API_HOST = "127.0.0.1"
API_PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8745


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _proxy_api(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length else b""
        # Forward Authorization/Origin verbatim — they are exactly what the
        # guard under test inspects.
        headers = {
            "Content-Type": self.headers.get("Content-Type", "application/json"),
            "Content-Length": str(len(body)),
        }
        for h in ("Authorization", "Origin", "Referer"):
            if self.headers.get(h):
                headers[h] = self.headers[h]
        try:
            conn = http.client.HTTPConnection(API_HOST, API_PORT, timeout=90)
            conn.request(self.command, self.path, body=body, headers=headers)
            resp = conn.getresponse()
            payload = resp.read()
            self.send_response(resp.status)
            self.send_header("Content-Type", resp.getheader("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except OSError:
            payload = b'{"error":"dev-api is not running. Start it: node scripts/dev-api.mjs"}'
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_error(405)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            super().do_GET()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(("127.0.0.1", PORT), NoCacheHandler) as httpd:
    print(f"Serving {PORT} with no-cache headers (proxying /api/* -> {API_HOST}:{API_PORT})")
    httpd.serve_forever()
