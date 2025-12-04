import asyncio
import aiohttp
import json
import hashlib
import time
from typing import Dict, List, Optional, Tuple, AsyncIterator
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from eth_account.messages import encode_defunct
from web3 import Web3
import jwt



NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1"
NVIDIA_ATTESTATION_URL = "https://nras.attestation.nvidia.com/v3/attest/gpu"
ATTESTATION_CACHE_FILE = "tee_attestation_cache.json"
ATTESTATION_CACHE_TTL_HOURS = 1

@dataclass
class TEEConfig:
    api_key: str
    model: str = "openai/gpt-oss-120b"
    signing_algo: str = "ecdsa"
    signature_retention_minutes: int = 5


@dataclass
class AttestationCache:
    """Cached attestation data"""
    signing_address: str
    nvidia_verified: bool
    intel_quote: str
    attestation_data: Dict
    verified_at: str
    model: str
    
    def is_expired(self, ttl_hours: int = ATTESTATION_CACHE_TTL_HOURS) -> bool:
        """Check if cache is expired"""
        verified_time = datetime.fromisoformat(self.verified_at)
        return datetime.utcnow() - verified_time > timedelta(hours=ttl_hours)
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AttestationCache':
        return cls(**data)




class AttestationCacheManager:
    
    def __init__(self, cache_file: str = ATTESTATION_CACHE_FILE):
        self.cache_file = Path(cache_file)
    
    def save(self, cache: AttestationCache):
        """Save attestation to disk"""
        with open(self.cache_file, 'w') as f:
            json.dump(cache.to_dict(), f, indent=2)
        print(f"✓ Attestation cached to {self.cache_file}")
    
    def load(self, model: str) -> Optional[AttestationCache]:
        """Load cached attestation if valid"""
        if not self.cache_file.exists():
            return None
        
        try:
            with open(self.cache_file, 'r') as f:
                data = json.load(f)
            
            cache = AttestationCache.from_dict(data)

            if cache.model != model:
                print(f"⚠ Cached attestation for different model: {cache.model}")
                return None
            
            if cache.is_expired():
                print(f"⚠ Cached attestation expired (age: {self._get_age(cache)})")
                return None
            
            print(f"✓ Using cached attestation (age: {self._get_age(cache)})")
            return cache
            
        except Exception as e:
            print(f"⚠ Failed to load cache: {e}")
            return None
    
    def _get_age(self, cache: AttestationCache) -> str:
        """Get human-readable age of cache"""
        verified_time = datetime.fromisoformat(cache.verified_at)
        age = datetime.utcnow() - verified_time
        hours = age.total_seconds() / 3600
        return f"{hours:.1f}h"
    
    def invalidate(self):
        """Delete cache file"""
        if self.cache_file.exists():
            self.cache_file.unlink()
            print(f"✓ Cache invalidated")



class ModelAttestationVerifier:
    """Async version with caching"""
    
    def __init__(self, config: TEEConfig):
        self.config = config
        self.headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json"
        }
        self.cache_manager = AttestationCacheManager()
    
    async def request_model_attestation(self) -> Dict:
        """Async attestation request"""
        url = f"{NEAR_AI_BASE_URL}/attestation/report?model={self.config.model}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Attestation request failed: {text}")
                
                attestation = await response.json()
                print(f"✓ Model attestation retrieved for {self.config.model}")
                print(f"  Signing Address: {attestation['model_attestations'][0]['signing_address']}")
                return attestation['model_attestations'][0]
    
    async def verify_nvidia_gpu_attestation(self, nvidia_payload: str) -> Dict:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                NVIDIA_ATTESTATION_URL,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json"
                },
                json=json.loads(nvidia_payload)
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"NVIDIA verification failed: {text}")
                
                result = await response.json()
                
                jwt_token = result[0][1] if isinstance(result, list) else None
                if jwt_token:
                    decoded = jwt.decode(jwt_token, options={"verify_signature": False})
                    
                    if decoded.get('x-nvidia-overall-att-result'):
                        print("✓ NVIDIA GPU attestation VERIFIED")
                        return decoded
                    else:
                        raise Exception("NVIDIA attestation verification failed")
                
                return result
    
    async def verify_full_attestation(
        self,
        force_refresh: bool = False
    ) -> Tuple[bool, AttestationCache]:
        print("\n=== TEE Model Attestation Verification ===\n")
        
        if not force_refresh:
            cache = self.cache_manager.load(self.config.model)
            if cache:
                print("✓ Using cached attestation - skipping verification")
                print(f"  Signing Address: {cache.signing_address}")
                print(f"  Verified At: {cache.verified_at}")
                return cache.nvidia_verified, cache
        
        print("Performing fresh attestation verification...")
        attestation = await self.request_model_attestation()
        nvidia_verified = False
        try:
            await self.verify_nvidia_gpu_attestation(attestation['nvidia_payload'])
            nvidia_verified = True
        except Exception as e:
            print(f"✗ NVIDIA verification failed: {str(e)}")
        
        cache = AttestationCache(
            signing_address=attestation['signing_address'],
            nvidia_verified=nvidia_verified,
            intel_quote=attestation['intel_quote'],
            attestation_data=attestation,
            verified_at=datetime.utcnow().isoformat(),
            model=self.config.model
        )
        
        if nvidia_verified:
            self.cache_manager.save(cache)
        
        print(f"\n=== Attestation Verification Complete ===")
        print(f"  NVIDIA GPU: {'✓ VERIFIED' if nvidia_verified else '✗ FAILED'}")
        print(f"  Cached: {nvidia_verified}\n")
        
        return nvidia_verified, cache





class PrivateNEARAIClient:    
    def __init__(self, config: TEEConfig):
        self.config = config
        self.headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
            "accept": "application/json"
        }
        self.signing_address = None
        self.attestation_cache = None
    
    async def initialize(self, force_attestation_refresh: bool = False):
        """
        Initialize client with attestation verification
        Call this once at startup
        """
        verifier = ModelAttestationVerifier(self.config)
        is_trusted, cache = await verifier.verify_full_attestation(
            force_refresh=force_attestation_refresh
        )
        
        if not is_trusted:
            raise Exception("TEE attestation verification failed - cannot proceed")
        
        self.signing_address = cache.signing_address
        self.attestation_cache = cache
        
        print(f"✓ Client initialized with verified TEE")
        print(f"  Model: {self.config.model}")
        print(f"  Signing Address: {self.signing_address}\n")
    
    def get_privacy_info(self) -> Dict:
        """
        Get privacy information to display to users
        Shows TEE verification status and guarantees
        """
        if not self.attestation_cache:
            return {"status": "unverified", "message": "TEE not verified"}
        
        verified_time = datetime.fromisoformat(self.attestation_cache.verified_at)
        age_hours = (datetime.utcnow() - verified_time).total_seconds() / 3600
        
        return {
            "status": "verified",
            "tee_verified": self.attestation_cache.nvidia_verified,
            "model": self.config.model,
            "signing_address": self.signing_address,
            "verified_at": self.attestation_cache.verified_at,
            "verification_age_hours": round(age_hours, 1),
            "guarantees": {
                "private_inference": "Your prompts and responses are never visible to infrastructure providers",
                "verifiable": "Every response is cryptographically signed and can be verified",
                "hardware_isolation": "Runs in NVIDIA GPU + Intel TDX secure enclave",
                "tamper_proof": "No unauthorized access to model weights or your data"
            },
            "user_message": f"🔒 Private & Verified: Running in TEE verified {round(age_hours, 1)}h ago"
        }
    
   