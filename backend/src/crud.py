from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from . import models, schemas, auth, utils
from . import score_util
from typing import Optional
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from .utils import country_to_continent


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: schemas.UserCreate):
    hashed_pwd = auth.get_password_hash(user.password)
    obj = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


async def get_user(db: AsyncSession, user_id: str):
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    return result.scalar_one_or_none()


async def create_fundraiser(db: AsyncSession, user_id: str, data: schemas.FundraiserCreate):
    """Create fundraiser and compute initial trust score"""
    clean_data = data.model_dump()
    if clean_data.get("country"):
        try:
            clean_data["continent"] = country_to_continent(clean_data["country"]).lower()
        except Exception:
            clean_data["continent"] = None
        clean_data["country"] = clean_data["country"].lower()
    else:
        clean_data["continent"] = None
    if clean_data.get("city"):
        clean_data["city"] = clean_data["city"].lower()
    obj = models.Fundraiser(**clean_data, user_id=user_id)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

async def get_fundraiser(db: AsyncSession, fundraiser_id: str):
    result = await db.execute(select(models.Fundraiser).where(models.Fundraiser.id == fundraiser_id))
    return result.scalar_one_or_none()

async def list_fundraisers(db: AsyncSession, user_id:str=None):
    if user_id:
        result = await db.execute(
            select(models.Fundraiser)
            .where(models.Fundraiser.user_id== user_id)
            .order_by(models.Fundraiser.created_at.desc())
        )
    else:
            result = await db.execute(
            select(models.Fundraiser)
            .order_by(models.Fundraiser.created_at.desc())
        )
    return result.scalars().all()

async def update_fundraiser(db: AsyncSession, fundraiser_id: str, data: schemas.FundraiserUpdate):
    """
    Update fundraiser with audit logging for critical fields.
    Handles Cloudinary image updates and triggers trust score recalculation.
    """
    # 1. Fetch existing fundraiser
    result = await db.execute(select(models.Fundraiser).where(models.Fundraiser.id == fundraiser_id))
    fundraiser = result.scalar_one_or_none()
    
    if not fundraiser:
        return None
    
    # 2. Track changes to critical fields for audit
    update_data = data.model_dump(exclude_unset=True)
    
    critical_fields = {
        "goal_amount": fundraiser.goal_amount,
        "wallet_address": fundraiser.wallet_address,
        "title": fundraiser.title,
        "long_description": fundraiser.long_description
    }
    
    # 3. Log changes to critical fields
    for field, old_value in critical_fields.items():
        if field in update_data and update_data[field] != old_value:
            audit_log = models.FundraiserAudit(
                fundraiser_id=fundraiser_id,
                field_changed=field,
                old_value=str(old_value) if old_value else None,
                new_value=str(update_data[field])
            )
            db.add(audit_log)
    
    # 4. Handle image update (delete old from Cloudinary if changed)
    if "image_url" in update_data and update_data["image_url"] != fundraiser.image_url:
        if fundraiser.image_url:
            await utils.delete_cloudinary_image(fundraiser.image_url)
    
    # 5. Apply updates
    for key, value in update_data.items():
        if key == "city" and value:
            setattr(fundraiser, key, value.lower())
            continue
        elif key == "country" and value:
            setattr(fundraiser, key, value.lower())
            try:
                continent= country_to_continent(value).lower()
            except Exception:
                continent = None
            setattr(fundraiser, "continent", continent)
        setattr(fundraiser, key, value)
    
    db.add(fundraiser)
    await db.commit()
    await db.refresh(fundraiser)
    
    if any(field in update_data for field in list(critical_fields.keys()) + ["image_url", "image_hash"]):
        await score_util.update_trust_score(db, fundraiser_id)
        await db.refresh(fundraiser)
    
    return fundraiser


async def add_update(db: AsyncSession, fundraiser_id: str, data: schemas.UpdateCreate):
    """
    Add update with Cloudinary image tracking.
    Image hash already computed in utils.process_image_upload().
    Triggers trust score recalculation.
    """
    update = models.CauseUpdate(
        cause_id=fundraiser_id,
        content=data.content,
        image_url=data.image_url,
        image_hash=data.image_hash  # Passed from process_image_upload
    )
    db.add(update)
    await db.commit()
    await db.refresh(update)
    
    # Recompute trust score (updates affect score, especially unique images)
    await score_util.update_trust_score(db, fundraiser_id)
    
    return update

async def list_updates(db: AsyncSession, fundraiser_id: str):
    result = await db.execute(
        select(models.CauseUpdate)
        .where(models.CauseUpdate.cause_id == fundraiser_id)
        .order_by(models.CauseUpdate.created_at.desc())
    )
    return result.scalars().all()


async def create_donation(db: AsyncSession, data: schemas.DonationCreate):
    """Create donation and update fundraiser amount_raised"""
    obj = models.Donation(**data.dict(), status="confirmed")
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    
    # Update fundraiser's amount_raised
    await score_util.recompute_fundraiser_amount_raised(db, data.fundraiser_id)
    
    return obj

async def list_donations_for_fundraiser(db: AsyncSession, fundraiser_id: str):
    result = await db.execute(
        select(models.Donation)
        .where(models.Donation.fundraiser_id == fundraiser_id)
        .order_by(models.Donation.created_at.desc())
    )
    return result.scalars().all()

async def list_donations(db: AsyncSession):
    result = await db.execute(
        select(models.Donation)
        .order_by(models.Donation.created_at.desc())
    )
    return result.scalars().all()


async def get_fundraiser_with_audit_logs(db: AsyncSession, fundraiser_id: str):
    """
    Get fundraiser with all related data.
    - Uses selectinload for efficient fetching (1 DB trip).
    - Sorting is now handled automatically by the Model definitions.
    """
    stmt = (
        select(models.Fundraiser)
        .where(models.Fundraiser.id == fundraiser_id)
        .options(
            selectinload(models.Fundraiser.audit_logs),
            selectinload(models.Fundraiser.updates)
        )
    )

    result = await db.execute(stmt)
    return result.scalar_one_or_none()

async def check_duplicate_images(db: AsyncSession, image_hash: str, exclude_id: Optional[str] = None) -> int:
    """
    Check if image hash exists in other fundraisers or updates.
    Returns count of duplicates found.
    """
    # Check fundraiser images
    query = select(func.count()).where(models.Fundraiser.image_hash == image_hash)
    if exclude_id:
        query = query.where(models.Fundraiser.id != exclude_id)
    
    result = await db.execute(query)
    fundraiser_dupes = result.scalar()
    
    # Check update images
    update_query = select(func.count()).where(models.CauseUpdate.image_hash == image_hash)
    update_result = await db.execute(update_query)
    update_dupes = update_result.scalar()
    
    return fundraiser_dupes + update_dupes

async def get_unique_update_images_count(db: AsyncSession, fundraiser_id: str) -> int:
    """
    Count unique update images (no duplicates within this fundraiser).
    Used for trust scoring bonus - rewards real progress photos.
    """
    result = await db.execute(
        select(func.count(func.distinct(models.CauseUpdate.image_hash)))
        .where(
            models.CauseUpdate.cause_id == fundraiser_id,
            models.CauseUpdate.image_hash.isnot(None)
        )
    )
    return result.scalar()