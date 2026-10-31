from flask import Flask, Response

from app.config import Settings

# The API only returns JSON, so nothing may load, run or frame. The site's own CSP (with nonces)
# is set by nginx (frontend/nginx), since nginx serves the HTML.
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"


def init_security_headers(app: Flask, settings: Settings) -> None:
    @app.after_request
    def set_headers(response: Response) -> Response:
        response.headers["Content-Security-Policy"] = API_CSP
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers.setdefault("Cache-Control", "no-store")
        if settings.is_prod:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response
