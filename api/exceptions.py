from fastapi import Request
from fastapi.responses import JSONResponse


class NotFoundError(Exception):
    def __init__(self, resource: str, identifier: str | int):
        self.resource = resource
        self.identifier = identifier


class DatabaseError(Exception):
    def __init__(self, message: str = "Database error"):
        self.message = message


async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "message": f"{exc.resource} '{exc.identifier}' not found",
        },
    )


async def database_error_handler(request: Request, exc: DatabaseError) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": "database_error", "message": exc.message},
    )
