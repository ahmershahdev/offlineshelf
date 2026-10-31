import logging

from flask import Flask, Response, jsonify
from pydantic import ValidationError
from sqlalchemy.orm.exc import StaleDataError
from werkzeug.exceptions import HTTPException

from app.schemas import Problem

log = logging.getLogger(__name__)


def problem(status: int, title: str, detail: str | None = None, **extra: object) -> Response:
    body = Problem(status=status, title=title, detail=detail, **extra)
    response = jsonify(body.model_dump(exclude_none=True))
    response.status_code = status
    response.mimetype = "application/problem+json"
    return response


def init_errors(app: Flask) -> None:
    @app.errorhandler(ValidationError)
    def validation_error(err: ValidationError) -> Response:
        # Only location, message and type go back; Pydantic's "input" field would echo the
        # submitted value (a password, for example) into the response.
        errors: list[dict[str, object]] = [
            {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in err.errors()
        ]
        return problem(422, "Validation failed", errors=errors)

    @app.errorhandler(StaleDataError)
    def stale(_: StaleDataError) -> Response:
        return problem(409, "Conflict", "The resource changed while you were editing it.")

    @app.errorhandler(HTTPException)
    def http_error(err: HTTPException) -> Response:
        status = err.code or 500
        response = problem(status, err.name, err.description)
        if status == 429 and err.response is not None:
            for header in ("Retry-After", "X-RateLimit-Limit", "X-RateLimit-Reset"):
                if header in err.response.headers:
                    response.headers[header] = err.response.headers[header]
        return response

    @app.errorhandler(Exception)
    def unexpected(err: Exception) -> Response:
        log.exception("Unhandled error", exc_info=err)
        return problem(500, "Internal Server Error")
