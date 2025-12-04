from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from . import models, crud
from playwright.async_api import async_playwright
from dataclasses import dataclass, field
from typing import List
import re
from .near_inference import NEARInference
from .schemas import FundraiserAuditorResponse
import logging

logger = logging.getLogger(__name__)
near_llm = NEARInference(model="openai/gpt-oss-120b")

WEIGHTS = {
    "base_score": 0.5, 
    "social_verified_bonus": 0.15,
    "website_match_bonus": 0.15, 
    "update_quality_bonus": 0.10,
    "unique_update_images_bonus": 0.05,
    "title_desc_match_bonus": 0.05, 
    "zero_updates_penalty": -0.05,
    "no_website_content_penalty": -0.05,
    "duplicate_image_penalty": -0.40, 
    "wallet_swap_penalty": -0.30,
    "instability_penalty_minor": -0.10,
    "instability_penalty_major": -0.20,
}

MAX_ACCEPTABLE_GOAL_EDITS = 2
MAX_ACCEPTABLE_DESC_EDITS = 3
MAX_ACCEPTABLE_WALLET_EDITS = 1
MAX_ACCEPTABLE_TITLE_EDITS = 2

@dataclass
class TrustReport:
    score: float
    flags: List[str] = field(default_factory=list)

async def fetch_website_content(fundraiser) -> tuple[str, bool]:
    """
    Fetch website content with caching
    Returns: (content, success_flag)
    """
    url = fundraiser.website_url
    if not url:
        return "No website provided.", False
    
    # Use cached snapshot if recent (within 7 days)
    if (fundraiser.website_snapshot and 
        fundraiser.last_website_fetch and
        datetime.utcnow() - fundraiser.last_website_fetch < timedelta(days=7)):
        logger.info(f"Using cached website content for {url}")
        return fundraiser.website_snapshot, True
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={"width": 1920, "height": 1080}
            )
            page = await context.new_page()
            
            # Increased timeout to 30s and wait for network idle
            response = await page.goto(
                url, 
                timeout=60000, 
                wait_until="networkidle"
            )

            if not response:
                await browser.close()
                logger.warning(f"No response from {url}")
                return "Website did not respond.", False
                
            if response.status >= 400:
                await browser.close()
                logger.warning(f"Website {url} returned status {response.status}")
                return f"Website returned error {response.status}.", False
            
            # Wait for JS rendering
            await page.wait_for_timeout(2000)
            
            text = await page.locator("body").inner_text()
            await browser.close()
            
            clean_text = " ".join(text.split()).strip()
            
            # Validate content
            if len(clean_text) < 50:
                logger.warning(f"Website {url} has minimal content ({len(clean_text)} chars)")
                return clean_text, False
            
            # Cache successful fetch
            fundraiser.website_snapshot = clean_text[:2000]
            fundraiser.last_website_fetch = datetime.utcnow()
            
            logger.info(f"Successfully fetched {len(clean_text)} chars from {url}")
            return clean_text[:2000], True
            
    except Exception as e:
        logger.error(f"Website scrape failed for {url}: {type(e).__name__}: {str(e)}")
        return f"Failed to scrape: {type(e).__name__}", False

def validate_social_links(socials: list) -> bool:
    """Validate social media profile links"""
    if not socials:
        return False
    
    patterns = [
        r"^https?:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]{4,}",
        r"^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]{5,}",
        r"^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]{3,}"
    ]
    
    for link in socials:
        link_str = str(link).strip().lower()
        if any(re.match(p, link_str) for p in patterns):
            return True
    return False

async def analyze_text_with_llm(title, desc, website_text, updates_text) -> dict:
    """Use NEAR AI to validate project consistency"""
    prompt = f"""You are a Zcash Grant Auditor. Validate this project data.

PROJECT TITLE: "{title}"
DESCRIPTION: "{desc[:1000]}"
WEBSITE SCRAPE: "{website_text[:1000]}"
UPDATES LOG: "{updates_text[:1000]}"

TASKS:
1. Check if WEBSITE SCRAPE is about the same project as DESCRIPTION. (If website is 404/empty, return FALSE).
2. Check if UPDATES LOG contains specific, human-written progress (not just "bump", "hi", or generic spam).
3. Check if TITLE and DESCRIPTION align (e.g. Title "Help Kids" matches Desc "Building a school").

RETURN JSON ONLY:
{{
    "is_website_consistent": boolean,
    "are_updates_high_quality": boolean,
    "is_title_consistent": boolean
}}
"""
    
    result = await near_llm.invoke_structured(
        messages=[{"role": "system", "content": prompt}],
        response_model=FundraiserAuditorResponse
    )
    
    return result["parsed"].model_dump()

async def compute_trust_score(session: AsyncSession, fundraiser) -> TrustReport:
    """
    Calculate comprehensive trust score with ALL checks.
    """
    score = WEIGHTS["base_score"]
    flags = []
    
    logger.info(f"Computing trust score for fundraiser {fundraiser.id}")
    

    # CHECK 1: Duplicate Main Image
    if fundraiser.image_hash:
        dupes = await crud.check_duplicate_images(
            session, 
            fundraiser.image_hash, 
            exclude_id=fundraiser.id
        )
        logger.info(f"Image hash {fundraiser.image_hash}: {dupes} duplicates found")
        
        if dupes > 0:
            score += WEIGHTS["duplicate_image_penalty"]
            flags.append(f"CRITICAL: Image used in {dupes} other fundraiser(s)")
    else:
        flags.append("Warning: No image available for duplicate check")
    

    # CHECK 2: Audit Log Analysis (Wallet/Goal changes)
    if hasattr(fundraiser, "audit_logs") and fundraiser.audit_logs:
        audit_counts = {"goal": 0, "wallet": 0, "title": 0}
        
        for log in fundraiser.audit_logs:
            if log.field_changed == "goal_amount":
                audit_counts["goal"] += 1
            elif log.field_changed == "wallet_address":
                audit_counts["wallet"] += 1
            elif log.field_changed == "title":
                audit_counts["title"] += 1
        
        # Wallet swapping (CRITICAL)
        if audit_counts["wallet"] > MAX_ACCEPTABLE_WALLET_EDITS:
            score += WEIGHTS["wallet_swap_penalty"]
            flags.append(f"CRITICAL: Wallet changed {audit_counts['wallet']} times")
        
        # Goal instability
        if audit_counts["goal"] > MAX_ACCEPTABLE_GOAL_EDITS:
            score += WEIGHTS["instability_penalty_minor"]
            flags.append(f"Penalty: Goal changed {audit_counts['goal']} times")
        
        # Title changes
        if audit_counts["title"] > MAX_ACCEPTABLE_TITLE_EDITS:
            score += WEIGHTS["instability_penalty_major"]
            flags.append(f"Warning: Title changed {audit_counts['title']} times")
    

    # CHECK 3: Social Verification
    if validate_social_links(fundraiser.social_links):
        score += WEIGHTS["social_verified_bonus"]
        flags.append(" Verified: Valid social profiles")
    else:
        flags.append("No valid social media links found")
    

    # CHECK 5: Update Image Uniqueness
    unique_images = await crud.get_unique_update_images_count(session, fundraiser.id)
    if unique_images >= 3:
        bonus = min(unique_images, 5) * WEIGHTS["unique_update_images_bonus"]
        score += bonus
        flags.append(f"Bonus: {unique_images} unique update images (+{bonus:.2f})")
    

    # CHECK 6: Missing Updates
    updates_list = fundraiser.updates if fundraiser.updates else []
    if len(updates_list) == 0:
        score += WEIGHTS["zero_updates_penalty"]
        flags.append("Penalty: No updates posted")
    

    # CHECK 7: Website Issues
    website_content, website_success = await fetch_website_content(fundraiser)
    
    if not website_success:
        score += WEIGHTS["no_website_content_penalty"]
        flags.append(f"Penalty: {website_content}")
        # Don't proceed with LLM if website failed
        website_content = ""
    

    if score > 0.0:
        try:
            updates_text = "\n".join([
                f"Update {i+1}: {u.content}" 
                for i, u in enumerate(updates_list)
            ])
            
            logger.info("Running LLM analysis...")
            analysis = await analyze_text_with_llm(
                title=fundraiser.title,
                desc=fundraiser.long_description or "",
                website_text=website_content,
                updates_text=updates_text
            )
            logger.info(f"LLM analysis result: {analysis}")
            
            # Website consistency (only if website was successfully fetched)
            if website_success and analysis.get("is_website_consistent"):
                score += WEIGHTS["website_match_bonus"]
                flags.append("Verified: Website matches description")
            elif website_success:
                flags.append("Warning: Website content inconsistent with description")
            
            # Title-description alignment
            if analysis.get("is_title_consistent"):
                score += WEIGHTS["title_desc_match_bonus"]
                flags.append("Verified: Title and description consistent")
            else:
                flags.append("Warning: Title doesn't match description")
            
            # Update quality
            if analysis.get("are_updates_high_quality") and len(updates_list) > 0:
                valid_updates = min(len(updates_list), 4)
                bonus = valid_updates * WEIGHTS["update_quality_bonus"]
                score += bonus
                flags.append(f"Verified: {valid_updates} quality updates (+{bonus:.2f})")
            elif len(updates_list) > 0:
                flags.append("Warning: Updates flagged as low quality")
                
        except Exception as e:
            logger.error(f"LLM analysis failed: {type(e).__name__}: {str(e)}")
            flags.append(f"analysis unavailable: {type(e).__name__}")
    else:
        flags.append("ℹLLM analysis skipped due to low initial score")
    


    final_score = max(0.0, min(score, 1.0))
    logger.info(f"Final trust score: {final_score:.2f} ({final_score * 100:.0f}/100)")
    logger.info(f"Flags: {flags}")
    
    return TrustReport(final_score, flags)

async def update_trust_score(db: AsyncSession, fundraiser_id: str) -> float:
    """
    Compute and persist trust score.
    """
    fundraiser = await crud.get_fundraiser_with_audit_logs(db, fundraiser_id)
    
    if not fundraiser:
        logger.error(f"Fundraiser {fundraiser_id} not found")
        return 0.0
    
    trust_report = await compute_trust_score(db, fundraiser)
    trust_score = trust_report.score * 100  # Convert to 0-100 scale
    
    await db.execute(
        update(models.Fundraiser)
        .where(models.Fundraiser.id == fundraiser_id)
        .values(
            trust_score=trust_score,
            trust_score_report={"score": trust_score, "flags": trust_report.flags},
            last_score_update=datetime.utcnow(),
            activated=True
        )
    )
    await db.commit()
    
    logger.info(f"Trust score updated: {trust_score:.2f}/100")
    return trust_score

async def recompute_fundraiser_amount_raised(db: AsyncSession, fundraiser_id: str) -> float:
    """Recalculate total raised from confirmed donations"""
    total_stmt = (
        select(func.coalesce(func.sum(models.Donation.amount), 0))
        .where(
            models.Donation.fundraiser_id == fundraiser_id,
            models.Donation.status == "confirmed"
        )
    )
    
    result = await db.execute(total_stmt)
    total_raised = result.scalar()
    
    update_stmt = (
        update(models.Fundraiser)
        .where(models.Fundraiser.id == fundraiser_id)
        .values(amount_raised=total_raised)
        .returning(models.Fundraiser.amount_raised)
    )
    
    update_result = await db.execute(update_stmt)
    await db.commit()
    
    return update_result.scalar_one()