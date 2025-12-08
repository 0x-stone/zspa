# src/models.py
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False) # Changed nullable to False
    hashed_password = Column(String, nullable=False) # Added for Auth
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    fundraisers = relationship("Fundraiser", back_populates="user")

class Fundraiser(Base):
    __tablename__ = "fundraisers"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    display_name = Column(String, nullable=False)
    website_url = Column(String, nullable=True)
    social_links = Column(JSON, nullable=True)

    preferred_chain = Column(String, nullable=True)
    preferred_token = Column(String, nullable=True)
    wallet_address = Column(String, nullable=True)

    trust_score= Column(Float, nullable=False, default=0.0)
    trust_score_report=Column(JSON, nullable=True)
    last_score_update= Column(DateTime(timezone=True))
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    continent =  Column(String, nullable=True)

    title = Column(String, nullable=False)
    short_description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)

    tags = Column(JSON, nullable=True)
    goal_amount = Column(Float, nullable=True)
    amount_raised=Column(Float, default=0.0)
    image_url = Column(String, nullable=True)

    status = Column(String, default="active")
    activated = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    website_snapshot= Column(Text, nullable=True)
    last_website_fetch= Column(DateTime, nullable=True)

    user = relationship("User", back_populates="fundraisers")
    donations = relationship("Donation", back_populates="fundraiser")
    image_hash = Column(String, index=True, nullable=True) 
    updates = relationship(
        "CauseUpdate", 
        back_populates="cause",
        order_by="desc(CauseUpdate.created_at)"
    )

    audit_logs = relationship(
        "FundraiserAudit", 
        back_populates="fundraiser",
        order_by="desc(FundraiserAudit.changed_at)"
    )


class FundraiserAudit(Base):
    """
    Tracks historical changes to critical fields.
    Create a row here whenever 'goal_amount' or 'long_description' changes.
    """
    __tablename__ = "fundraiser_audit"
    
    id = Column(String, primary_key=True, default=gen_uuid)
    fundraiser_id = Column(String, ForeignKey("fundraisers.id"), nullable=False)
    
    field_changed = Column(String, nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    fundraiser = relationship("Fundraiser", back_populates="audit_logs")


class CauseUpdate(Base):
    __tablename__ = "cause_updates"

    id = Column(String, primary_key=True, default=gen_uuid)
    cause_id = Column(String, ForeignKey("fundraisers.id"), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    image_hash = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    cause = relationship("Fundraiser", back_populates="updates")

class Donation(Base):
    __tablename__ = "donations"

    id = Column(String, primary_key=True, default=gen_uuid)
    fundraiser_id = Column(String, ForeignKey("fundraisers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    amount_zec=Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status=Column(String, nullable=True)
    fundraiser = relationship("Fundraiser", back_populates="donations")
