from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json

from ..database import get_db
from .. import crud, schemas, auth, models, utils
from .. import score_util

router = APIRouter(prefix="/fundraisers", tags=["Fundraisers"])

@router.post("/", response_model=schemas.FundraiserResponse)
async def create_fundraiser(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    display_name: str = Form(...),
    short_description: str = Form(None),
    long_description: str = Form(None),
    goal_amount: float = Form(None),
    preferred_chain: str = Form("zcash"),
    preferred_token: str = Form("zcash"),
    wallet_address: str = Form(None),
    country: str = Form(None),
    city: str = Form(None),
    website_url: str = Form(None),
    social_links_json: str = Form(None),
    tags_json: str = Form(None),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db), 
    
):

    image_url, image_hash = await utils.process_image_upload(image, folder="fundraisers")
    social_links = json.loads(social_links_json) if social_links_json else []
    tags = json.loads(tags_json) if tags_json else []

    fundraiser_data = schemas.FundraiserCreate(
        title=title,
        display_name=display_name,
        short_description=short_description,
        long_description=long_description,
        goal_amount=goal_amount,
        preferred_chain=preferred_chain,
        preferred_token=preferred_token,
        wallet_address=wallet_address,
        country=country,
        city=city,
        website_url=website_url,
        social_links=social_links,
        tags=tags,
        image_url=image_url,
        image_hash=image_hash 
    )

    result= await crud.create_fundraiser(db, current_user.id, fundraiser_data)
    background_tasks.add_task(score_util.update_trust_score, db, result.id)
    return result

@router.patch("/{fundraiser_id}", response_model=schemas.FundraiserResponse)
async def update_fundraiser(
    fundraiser_id: str,
    title: Optional[str] = Form(None),
    short_description: Optional[str] = Form(None),
    long_description: Optional[str] = Form(None),
    goal_amount: Optional[float] = Form(None),
    wallet_address: Optional[str] = Form(None),
    social_links_json: Optional[str] = Form(None),
    tags_json: Optional[str] = Form(None),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    fundraiser = await crud.get_fundraiser(db, fundraiser_id)
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    if fundraiser.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    

    image_url = fundraiser.image_url 
    image_hash = fundraiser.image_hash
    
    
    if image:
        image_url, image_hash = await utils.process_image_upload(image, folder="fundraisers")
    
    social_links = json.loads(social_links_json) if social_links_json else None
    tags = json.loads(tags_json) if tags_json else None
    
    update_data = schemas.FundraiserUpdate(
        title=title,
        short_description=short_description,
        long_description=long_description,
        goal_amount=goal_amount,
        wallet_address=wallet_address,
        social_links=social_links,
        tags=tags,
        image_url=image_url,
        image_hash=image_hash
    )
    return await crud.update_fundraiser(db, fundraiser_id, update_data)


@router.post("/{fundraiser_id}/updates", response_model=schemas.UpdateResponse)
async def add_update(
    fundraiser_id: str, 
    content: str = Form(...),
    image: UploadFile = File(None),
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(get_db)
):
    fundraiser = await crud.get_fundraiser(db, fundraiser_id)
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    if fundraiser.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    image_url, image_hash = await utils.process_image_upload(image, folder="updates")
    
    data = schemas.UpdateCreate(
        content=content,
        image_url=image_url,
        image_hash=image_hash  
    )
    
    return await crud.add_update(db, fundraiser_id, data)


@router.get("/", response_model=List[schemas.FundraiserResponse])
async def list_fundraisers(db: AsyncSession = Depends(get_db)):
    return await crud.list_fundraisers(db)

@router.get("/{fundraiser_id}", response_model=schemas.FundraiserResponse)
async def get_fundraiser(fundraiser_id: str, db: AsyncSession = Depends(get_db)):
    fundraiser = await crud.get_fundraiser(db, fundraiser_id)
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    return fundraiser

@router.get("/{fundraiser_id}/updates", response_model=List[schemas.UpdateResponse])
async def get_updates(fundraiser_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.list_updates(db, fundraiser_id)

@router.get("/{fundraiser_id}/donations", response_model=List[schemas.DonationResponse])
async def list_donations(fundraiser_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.list_donations_for_fundraiser(db, fundraiser_id)

@router.get("/{fundraiser_id}/trust-report")
async def get_trust_report(fundraiser_id: str, db: AsyncSession = Depends(get_db)):
    fundraiser = await crud.get_fundraiser(db, fundraiser_id)
    if not fundraiser:
        raise HTTPException(status_code=404, detail="Fundraiser not found")
    
    return {
        "fundraiser_id": fundraiser_id,
        "trust_score": fundraiser.trust_score,
        "last_updated": fundraiser.last_score_update,
        "report": fundraiser.trust_score_report or {
            "score": fundraiser.trust_score,
            "flags": ["Trust score being computed..."]
        }
    }