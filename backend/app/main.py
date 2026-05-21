from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.business_repository import initialize_business_database
from app.config import settings
from app.routes import router
from app.security import security_middleware
from app.storage import initialize_database


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    initialize_business_database()
    yield


app = FastAPI(
    title=settings.app_name,
    debug=False if settings.is_production else settings.app_debug,
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.middleware("http")(security_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=settings.cors_method_list,
    allow_headers=settings.cors_header_list,
)


@app.get("/")
def read_root():
    return {
        "message": "My Expenses API online",
        "docs": None if settings.is_production else "/docs",
        "health": f"{settings.api_prefix}/health",
    }


app.include_router(router, prefix=settings.api_prefix)