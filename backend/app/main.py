from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import router
from app.storage import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix=settings.api_prefix)

@app.get("/")
def read_root():
    return {
        "message": "My Expenses API online",
        "docs": "/docs",
        "health": "/api/health",
    }