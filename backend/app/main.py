from fastapi import FastAPI

from app.api.auth import admin_router, auth_router
from app.api.health import router as health_router

app = FastAPI(title="api")

app.include_router(health_router)
app.include_router(admin_router)
app.include_router(auth_router)
