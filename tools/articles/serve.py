"""Serves tools/articles/build to the dev app (http://localhost:4200) for upload.js."""

import http.server
from pathlib import Path

BUILD = Path(__file__).resolve().parent / 'build'
PORT = 4399


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BUILD), **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:4200')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    print(f'Serving {BUILD} on http://127.0.0.1:{PORT}')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
