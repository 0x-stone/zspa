from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str 
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: List[str]
    NEAR_TEE_ENDPOINT: str
    NEAR_AI_API_KEY: str
    MAX_DONATION_STATUS_POLL: int =100
    DONATION_STATUS_POLL_INTERVAL: int = 36
    CLOUDINARY_CLOUD_NAME:str
    CLOUDINARY_API_SECRET:str
    CLOUDINARY_API_KEY:str
    
    class Config:
        env_file = ".env"

settings = Settings()