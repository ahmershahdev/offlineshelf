from flask import Blueprint, Flask

from app.api.auth import bp as auth_bp
from app.api.health import bp as health_bp
from app.api.lists import bp as lists_bp


def register_blueprints(app: Flask) -> None:
    api = Blueprint("api", __name__, url_prefix="/api/v1")
    api.register_blueprint(health_bp)
    api.register_blueprint(auth_bp)
    api.register_blueprint(lists_bp)
    app.register_blueprint(api)
