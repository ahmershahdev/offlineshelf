# syntax=docker/dockerfile:1
FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.12.17 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /src
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev --no-install-project

FROM python:3.12-slim
ENV PATH=/opt/venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN groupadd --system app && useradd --system --gid app --no-create-home app
COPY --from=build /opt/venv /opt/venv
WORKDIR /srv
COPY --chown=root:root alembic.ini gunicorn.conf.py ./
COPY --chown=root:root migrations ./migrations
COPY --chown=root:root app ./app
USER app
EXPOSE 8000
CMD ["gunicorn", "-c", "gunicorn.conf.py", "app.wsgi:app"]
