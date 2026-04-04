from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness check. Returns 200 when the service is up."""
    return {"status": "ok", "service": "api"}
