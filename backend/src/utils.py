# src/utils.py
import hashlib
import cloudinary
import cloudinary.uploader
from fastapi import UploadFile, HTTPException
from typing import Optional, Tuple
from .config  import  settings
import pycountry_convert as pc

# Configure Cloudinary
cloudinary.config( 
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY, 
    api_secret=settings.CLOUDINARY_API_SECRET
)

# Allowed image types
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  

async def process_image_upload(file: Optional[UploadFile], folder: str = "fundraisers") -> Tuple[Optional[str], Optional[str]]:
    """
    Process image upload with validation, hashing, and Cloudinary storage.
    
    Args:
        file: UploadFile from FastAPI
        folder: Cloudinary folder path
    
    Returns:
        Tuple of (image_url, image_hash) or (None, None) if no file
    """
    if not file:
        return None, None

    try:
        # Validate file type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Validate file size
        if len(content) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Max size: {MAX_IMAGE_SIZE / (1024*1024):.0f}MB"
            )
        
        image_hash = hashlib.sha256(content).hexdigest()
        
        await file.seek(0)
        
        upload_result = cloudinary.uploader.upload(
            file.file,
            folder=folder,
            resource_type="image",
            transformation=[
                {"width": 1200, "height": 800, "crop": "limit"},
                {"quality": "auto:good"}
            ]
        )
        
        image_url = upload_result.get("secure_url")
        
        if not image_url:
            raise HTTPException(status_code=500, detail="Cloudinary upload failed")
        
        return image_url, image_hash

    except HTTPException:
        raise
    except Exception as e:
        print(f"Image upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

async def delete_cloudinary_image(image_url: str) -> bool:
    """
    Delete image from Cloudinary by URL.
    Useful when updating/deleting fundraisers.
    """
    try:
        parts = image_url.split("/")
        public_id_with_ext = "/".join(parts[-2:]) 
        public_id = public_id_with_ext.rsplit(".", 1)[0]
        
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        print(f"Image deletion error: {e}")
        return False
    

def country_to_continent(country_name):
   country_alpha2 = pc.country_name_to_country_alpha2(country_name)
   country_continent_code = pc.country_alpha2_to_continent_code(country_alpha2)
   country_continent_name = pc.convert_continent_code_to_continent_name(country_continent_code)
   return country_continent_name
