from typing import Any

from flask import abort, request
from pydantic import BaseModel

from app.models import User
from app.security.session import current_user


def json_body[M: BaseModel](model: type[M]) -> M:
    if not request.is_json:
        abort(415, description="Send a JSON body with Content-Type: application/json.")
    data: Any = request.get_json(silent=True)
    if data is None:
        abort(400, description="The body is not valid JSON.")
    return model.model_validate(data)


def require_user() -> User:
    user = current_user()
    if user is None:
        abort(401, description="Sign in first.")
    return user
