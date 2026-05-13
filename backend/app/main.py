from fastapi import FastAPI

from app.config import settings
from app.routes import router

app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug
)

app.include_router(router, prefix=settings.api_prefix)


@app.get("/", tags=["Root"])
def root() -> dict:
    return {
        "message": f"{settings.app_name} online"
    }