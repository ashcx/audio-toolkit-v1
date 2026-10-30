from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):
  self.send_header('Cross-Origin-Opener-Policy','same-origin')
  self.send_header('Cross-Origin-Embedder-Policy','require-corp')
  super().end_headers()
ThreadingHTTPServer(('127.0.0.1',4195),lambda *args,**kwargs:Handler(*args,directory='.artifacts/speech-upstream',**kwargs)).serve_forever()
