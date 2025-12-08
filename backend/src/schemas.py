
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str



class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True


class FundraiserBase(BaseModel):
    display_name: str
    website_url: Optional[str] = None
    social_links: Optional[List[str]] = None
    preferred_chain: Optional[str] = "zcash"
    preferred_token:Optional[str]="zcash"
    country: Optional[str] = None
    city: Optional[str] = None
    title: str
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    amount_raised:Optional[float]=0.0
    tags: Optional[List[str]] = None
    goal_amount: Optional[float] = None
    image_url: Optional[str] = None

class FundraiserCreate(FundraiserBase):
    image_hash: Optional[str] = None
    wallet_address: Optional[str] = None

class FundraiserResponse(FundraiserBase):
    id: str
    user_id: str  
    created_at: datetime
    trust_score: Optional[float] = None
    activated:bool

    class Config:
        orm_mode = True


class UpdateCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    image_hash: Optional[str] = None

class UpdateResponse(UpdateCreate):
    id: str
    created_at: datetime

    class Config:
        orm_mode = True


class DonationCreate(BaseModel):
    fundraiser_id: str
    amount: float
    amount_zec: float

class DonationResponse(DonationCreate):
    id: str
    created_at: datetime
    amount:float
    amount_zec:float

    class Config:
        orm_mode = True


class FundraiserSearchRequest(BaseModel):
    text_query: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None
    min_trust_score: Optional[float] = 0.0 

class FundraiserUpdate(BaseModel):
    display_name: Optional[str] = None
    website_url: Optional[str] = None
    social_links: Optional[List[str]] = None
    preferred_chain: Optional[str] = None
    wallet_address: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    title: Optional[str] = None
    short_description: Optional[str] = None
    long_description: Optional[str] = None
    tags: Optional[List[str]] = None
    goal_amount: Optional[float] = None
    image_url: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None


class FundraiserScoreResponse(FundraiserResponse):
    match_score: Optional[float]   
    trust_score: float   
    wallet_address: Optional[str] = None
    class Config:
        orm_mode = True

class FundraiserAuditorResponse(BaseModel):
      is_website_consistent:bool
      are_updates_high_quality:bool
      is_title_consistent:bool
