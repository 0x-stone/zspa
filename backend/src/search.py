# src/search_engine.py
import json
from typing import List, Optional, Set
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    select, func, case, or_, desc, literal_column, and_
)

from . import models, schemas


DEFAULT_LIMIT = 20
DEFAULT_OFFSET = 0

WEIGHTS = {           
    "text_match_title": 50,
    "text_match_desc": 20,
    "text_match_tags": 15,
    "location_match": 60,
    "recency_bonus": 25,
    "progress_bonus": 20,

    "interest_overlap": 15.0,
    "per_tag_match": 5.0,
    "tag_point": 10,
    "trust_weight": 1.5
}


def normalize_tags_field(tags_field) -> Set[str]:
    """Normalize tags to lowercase set"""
    if not tags_field: return set()
    if isinstance(tags_field, (list, tuple)): 
        return set(t.lower() for t in tags_field)
    if isinstance(tags_field, str):
        try:
            parsed = json.loads(tags_field)
            if isinstance(parsed, list): 
                return set(t.lower() for t in parsed)
        except:
            return set(t.strip().lower() for t in tags_field.split(",") if t.strip())
    return set()


async def search_and_rank_fundraisers(
    db: AsyncSession,
    search_params: schemas.FundraiserSearchRequest,
    interests: List[str] = [],
    limit: int = DEFAULT_LIMIT,
    offset: int = DEFAULT_OFFSET,
) -> List[schemas.FundraiserScoreResponse]:

    # 1. PARSE QUERY INTO KEYWORDS
    text_query = (search_params.text_query or "").strip()
    keywords = []
    if text_query:
        keywords = [k.lower() for k in text_query.split() if k.strip() and len(k) > 2]

    # 2. DEFINING THE BASE SCORE (The Trust Score)
    base_score_expr = func.coalesce(models.Fundraiser.trust_score, 0.0) * WEIGHTS["trust_weight"]

    # 3. RELEVANCE SCORE (Multi-Keyword)
    relevance_expr = literal_column("0")
    if keywords:
        keyword_scores = []
        for k in keywords:
            k_pat = f"%{k}%"
            # Add up matches in Title (High value) vs Desc (Low value)
            k_score = (
                case((models.Fundraiser.title.ilike(k_pat), WEIGHTS["text_match_title"]), else_=0) + 
                case((models.Fundraiser.short_description.ilike(k_pat), WEIGHTS["text_match_desc"]), else_=0) +
                case((models.Fundraiser.tags.ilike(k_pat), WEIGHTS["text_match_tags"]), else_=0)
            )
            keyword_scores.append(k_score)
        
        relevance_expr = sum(keyword_scores, literal_column("0"))

    # 4. LOCATION & RECENCY
    location_expr = literal_column("0")
    if getattr(search_params, "location", None):
        loc_q = f"%{search_params.location.strip().lower()}%"
        location_expr = case((or_(
            models.Fundraiser.country.ilike(loc_q),
            models.Fundraiser.city.ilike(loc_q)
        ), WEIGHTS["location_match"]), else_=0)

    recent_cutoff = datetime.utcnow() - timedelta(days=60)
    recency_expr = case(
        (models.Fundraiser.created_at >= recent_cutoff, WEIGHTS["recency_bonus"]), 
        else_=0
    )

    # 5. PROGRESS (Show active projects)
    progress_ratio = models.Fundraiser.amount_raised / func.nullif(models.Fundraiser.goal_amount, 0)
    progress_expr = case(
        ((models.Fundraiser.amount_raised > 0) & (progress_ratio > 0.0) & (progress_ratio < 1.0), 
         WEIGHTS["progress_bonus"]), 
        else_=0
    )

    # 6. TOTAL DB SCORE CALCULATION
    total_score_expr = base_score_expr + relevance_expr + location_expr + recency_expr + progress_expr


    stmt = (
        select(
            models.Fundraiser, 
            base_score_expr.label("trust_val"), 
            total_score_expr.label("total_score")
        )
        .where(models.Fundraiser.status == "active")
    )


    # A. Text Search
    if keywords:
        or_conditions = []
        for k in keywords:
            k_pat = f"%{k}%"
            or_conditions.append(or_(
                models.Fundraiser.title.ilike(k_pat),
                models.Fundraiser.short_description.ilike(k_pat),
                models.Fundraiser.tags.ilike(k_pat)
            ))
        if or_conditions:
            stmt = stmt.where(or_(*or_conditions))

    # B. Location Filter
    if getattr(search_params, "location", None):
        loc_q = f"%{search_params.location.strip().lower()}%"
        stmt = stmt.where(or_(
            models.Fundraiser.country.ilike(loc_q),
            models.Fundraiser.city.ilike(loc_q)
        ))

    # Order by total_score desc
    stmt = stmt.order_by(desc("total_score")).limit(limit).offset(offset)

    result = await db.execute(stmt)
    rows = result.all()

    final_results = []
    
    for row in rows:
        fundraiser: models.Fundraiser = row[0]
        trust_val = float(row[1] or 0) 
        db_total = float(row[2] or 0)

        # 1. Personalization (Interests)
        affinity = 0.0
        if interests:
            affinity = _calculate_affinity_score(fundraiser, interests)

        # 2. Explicit Tag Filter Scoring
        tag_match = _calculate_tag_match(fundraiser, getattr(search_params, "tags", None))

        final_score = db_total + affinity + tag_match

        # 3. Format Response
        fs = {
            # Copy all fundraiser fields
            c.name: getattr(fundraiser, c.name) for c in fundraiser.__table__.columns
        }
        
        # Add computed fields for the frontend
        fs.update({
            "match_score": final_score, 
            "trust_score": getattr(fundraiser, "trust_score", 0.0) 
        })
        
        try:
            final_results.append(schemas.FundraiserScoreResponse(**fs).model_dump())
        except Exception as e:
            print(f"Skipping row due to schema error: {e}")

    final_results.sort(key=lambda x: x.get("match_score"), reverse=True)
    return final_results


def _calculate_affinity_score(fundraiser: models.Fundraiser, interests: List[str]) -> float:
    """Calculate personalization score based on user interests"""
    if not interests:
        return 0.0

    score = 0.0
    user_interests = set(i.lower() for i in interests)

    # Get fundraiser tags
    f_tags = normalize_tags_field(getattr(fundraiser, "tags", None))
    
    # Calculate intersection
    matching_tags = user_interests.intersection(f_tags)
    
    if matching_tags:
        score += WEIGHTS.get("interest_overlap", 0)
    
    # Add points per matched tag
    score += len(matching_tags) * WEIGHTS.get("per_tag_match", 5.0)
    
    return score

def _calculate_tag_match(fundraiser: models.Fundraiser, search_tags: Optional[List[str]]) -> float:
    """Calculate explicit tag match score"""
    if not search_tags:
        return 0.0
    
    f_tags = normalize_tags_field(getattr(fundraiser, "tags", None))
    s_tags = set(t.lower() for t in search_tags)
    
    return len(f_tags.intersection(s_tags)) * WEIGHTS["tag_point"]

