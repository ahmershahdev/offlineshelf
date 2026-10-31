def ping(value: str) -> str:
    """Round trip through Redis and a worker; used by the M1 end-to-end test and smoke checks."""
    return f"pong:{value}"
