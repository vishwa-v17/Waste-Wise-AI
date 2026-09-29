import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, model_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="ignore"
    )

    PROJECT_NAME: str = "WasteWise AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    ENABLE_DEMO_SEED: bool = os.getenv("ENABLE_DEMO_SEED", "true").lower() in ("true", "1", "yes")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "wastewise_local_dev_secret_only_change_in_production_key_32c")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database (PostgreSQL recommended; SQLite fallback for single-click local running)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./wastewise.db")

    # LLM Settings (OpenAI or compatible API)
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    AI_MAX_PROMPT_LENGTH: int = 500
    AI_REQUEST_TIMEOUT_SECONDS: int = 10
    AI_MAX_TOKENS: int = 400

    # CORS Allowed Origins
    # Can be set via comma-separated string: CORS_ORIGINS="https://wastewise.vercel.app,http://localhost:5173"
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if v and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    @model_validator(mode="after")
    def validate_production_security(self):
        env = (self.ENVIRONMENT or "development").lower()
        weak_defaults = [
            "wastewise_super_secret_jwt_key_2026_production_ready",
            "wastewise_local_dev_secret_only_change_in_production_key_32c",
            "secret",
            "changeme"
        ]
        if env == "production":
            if not self.SECRET_KEY or self.SECRET_KEY in weak_defaults or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: "
                    "In production (ENVIRONMENT=production), a strong random SECRET_KEY "
                    "of at least 32 characters must be provided via environment variables. "
                    "Generate one using `openssl rand -hex 32`."
                )
        return self

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                import json
                try:
                    origins = json.loads(v)
                except Exception:
                    origins = [v.strip()]
            else:
                origins = v
        else:
            origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

        # Security hardening: Disallow wildcard '*' in origins when credentials are used, and strip trailing slashes
        sanitized = [origin.rstrip("/") for origin in origins if origin != "*"]
        return sanitized if sanitized else ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()

