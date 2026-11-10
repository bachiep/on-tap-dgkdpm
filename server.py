import http.server
import socketserver
import urllib.request
import urllib.parse
import json
import os
import sys

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class TMDTRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/sync' or self.path.startswith('/api/sync?'):
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                long_url = payload.get('url', '')
                if not long_url:
                    self._send_json({'error': 'Missing url parameter'}, 400)
                    return

                isgd_url = f"https://is.gd/create.php?format=json&url={urllib.parse.quote(long_url)}"
                req = urllib.request.Request(isgd_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))

                if 'shorturl' in data:
                    short_url = data['shorturl']
                    short_id = short_url.rstrip('/').split('/')[-1]
                    self._send_json({'shortUrl': short_url, 'id': short_id, 'success': True})
                else:
                    self._send_json({'error': data.get('errormessage', 'Failed to shorten URL'), 'success': False}, 502)
            except Exception as e:
                self._send_json({'error': str(e), 'success': False}, 500)
        else:
            self.send_error(404, "Endpoint not found")

    def do_GET(self):
        if self.path.startswith('/api/sync'):
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)
            target = query.get('url', [''])[0] or query.get('id', [''])[0]

            if not target:
                self._send_json({'error': 'Missing short url or code'}, 400)
                return

            if not target.startswith('http://') and not target.startswith('https://'):
                target = f"https://is.gd/{target}"

            forward_url = f"https://is.gd/forward.php?format=json&shorturl={urllib.parse.quote(target)}"
            try:
                req = urllib.request.Request(forward_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = json.loads(resp.read().decode('utf-8'))

                if 'url' in data:
                    self._send_json({'url': data['url'], 'success': True})
                else:
                    self._send_json({'error': data.get('errormessage', 'Short URL not found'), 'success': False}, 404)
            except Exception as e:
                self._send_json({'error': str(e), 'success': False}, 500)
        else:
            super().do_GET()

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # Prevent browser caching stale HTML/CSS/JS
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ThreadingHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    with ThreadingHTTPServer(("", port), TMDTRequestHandler) as httpd:
        print(f"Hệ thống ôn tập ĐG&KĐCLPM phục vụ tại: http://localhost:{port}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nĐã tắt máy chủ.")

