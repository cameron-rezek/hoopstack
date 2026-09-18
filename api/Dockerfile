# Hoopstack API — FastAPI + asyncpg
#
# Build context is ./api, so the image never sees frontend/node_modules or the
# local virtualenvs. Application code lands at /app/api because every module
# imports absolutely (`from api.config import settings`), which means /app has
# to be the import root.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so edits to application code reuse this layer.
COPY requirements.txt ./api/requirements.txt
RUN pip install --no-cache-dir -r api/requirements.txt

COPY . ./api/

# Drop root. Nothing in the image needs write access at runtime.
RUN useradd --create-home --uid 10001 hoopstack && chown -R hoopstack:hoopstack /app
USER hoopstack

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
