from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json

from ..database import get_db
from .. import crud, schemas

router = APIRouter(prefix="/donations", tags=["Donations"])



@router.get("/", response_model=List[schemas.DonationResponse])
async def list_donationss(db: AsyncSession = Depends(get_db)):
    return await crud.list_donations(db)

