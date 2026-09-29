import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException, status
from typing import Dict, Deque

class InMemoryRateLimiter:
    """
    Sliding-window in-memory rate limiter per IP / User identifier.
    Thread-safe for standard ASGI async event loop execution.
    """
    def __init__(self):
        # Maps key -> deque of timestamps
        self._records: Dict[str, Deque[float]] = defaultdict(deque)

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int) -> None:
        now = time.time()
        cutoff = now - window_seconds
        timestamps = self._records[key]

        # Purge timestamps outside the window
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        if len(timestamps) >= max_requests:
            retry_after = int(window_seconds - (now - timestamps[0])) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
                headers={"Retry-After": str(max(1, retry_after))}
            )

        timestamps.append(now)

limiter = InMemoryRateLimiter()

def get_client_ip(request: Request) -> str:
    # Handle X-Forwarded-For for proxies / reverse proxies
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# Dependency factories
def rate_limit_auth(request: Request):
    """Limits login / register / reset-password requests to 15 per minute per IP."""
    ip = get_client_ip(request)
    limiter.check_rate_limit(f"auth:{ip}", max_requests=15, window_seconds=60)

def rate_limit_ai(request: Request):
    """Limits AI chat / query requests to 30 per minute per IP."""
    ip = get_client_ip(request)
    limiter.check_rate_limit(f"ai:{ip}", max_requests=30, window_seconds=60)

def rate_limit_upload(request: Request):
    """Limits bulk CSV upload requests to 10 per minute per IP."""
    ip = get_client_ip(request)
    limiter.check_rate_limit(f"upload:{ip}", max_requests=10, window_seconds=60)
