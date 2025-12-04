import os
import json
import hashlib
import aiohttp
from typing import Dict, Any, Optional, Type, TypeVar
from eth_account.messages import encode_defunct
from eth_account import Account
from pydantic import BaseModel
from .config import settings

T = TypeVar('T', bound=BaseModel)
NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1"
NEAR_AI_API_KEY = settings.NEAR_AI_API_KEY


class NEARInference:
    """qrapper for NEAR AI Private Inference with streaming and NEAR-compliant hashing."""

    def __init__(self, model: str = "openai/gpt-oss-120b"):
        self.model = model
        self.api_key = NEAR_AI_API_KEY

    async def invoke(
        self,
        messages: list,
        temperature: float = 0.3,
        response_format: Optional[Dict] = None
    ) -> Dict[str, Any]:
        request_data = {
            "messages": messages,
            "stream": True,
            "model": self.model,
            "temperature": temperature
        }

        if response_format:
            request_data["response_format"] = response_format

        request_body = json.dumps(request_data, separators=(',', ':'))
        request_hash = hashlib.sha256(request_body.encode()).hexdigest()

        collected_content = ""
        chat_id = None
        response_hasher = hashlib.sha256()

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{NEAR_AI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                data=request_body
            ) as response:

                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Chat completion failed: {text}")

                # Stream lines from the response
                async for line_bytes in response.content:
                    response_hasher.update(line_bytes)
                    line_text = line_bytes.decode('utf-8').strip()
                    
                    if not line_text:
                        continue

                    if line_text.startswith("data: ") and line_text != "data: [DONE]":
                        try:
                            data = json.loads(line_text[6:])  
                            if not chat_id and 'id' in data:
                                chat_id = data['id']

                            # Safely extract content
                            choices = data.get("choices", [])
                            if choices and isinstance(choices, list):
                                delta = choices[0].get("delta", {})
                                delta_content = delta.get("content", "")
                                collected_content += delta_content

                        except json.JSONDecodeError:
                            continue

        # Get the final digest from the accumulated raw bytes
        response_hash = response_hasher.hexdigest()

        return {
            "content": collected_content,
            "chat_id": chat_id,
            "request_hash": request_hash,
            "response_hash": response_hash
        }

    async def invoke_structured(
        self,
        messages: list,
        response_model: Type[T],
        temperature: float = 0.3
    ) -> Dict[str, Any]:

        schema = response_model.model_json_schema()
        schema_str = json.dumps(schema, indent=2)

        enhanced_messages = json.loads(json.dumps(messages))  # deep copy

        # Find last system message
        system_msg_idx = None
        for i in range(len(enhanced_messages) - 1, -1, -1):
            if enhanced_messages[i].get("role") == "system":
                system_msg_idx = i
                break

        schema_instruction = f"""
You must respond with valid JSON matching this exact schema:
{schema_str}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown, no explanations, no preamble
- Do NOT wrap in ```json``` or ``` blocks
- Ensure all required fields are present
- Match the exact field names and types from the schema exactly
"""

        if system_msg_idx is not None:
            enhanced_messages[system_msg_idx]["content"] += schema_instruction
        else:
            enhanced_messages.insert(0, {"role": "system", "content": schema_instruction})

        result = await self.invoke(enhanced_messages, temperature)

        content = result["content"].strip()

        if content.startswith("```"):
            content = content.split("```")[1].strip()
        content = content.replace("```json", "").replace("```", "").strip()

        try:
            parsed_data = json.loads(content)
            parsed_model = response_model(**parsed_data)

            return {
                "parsed": parsed_model,
                "content": result["content"],
                "chat_id": result.get("chat_id"),
                "request_hash": result.get("request_hash"),
                "response_hash": result.get("response_hash")
            }

        except Exception as e:
            raise Exception(
                f"Failed to parse LLM response into {response_model.__name__}: {e}\n"
                f"Raw content: {content}"
            )


async def verify_inference(
    chat_id: str,
    request_hash: str,
    response_hash: str,
    model: str = "openai/gpt-oss-120b",
    origin_node: str = "",
    max_retries: int = 3
) -> Dict[str, Any]:
    """Verify NEAR AI inference using cryptographic signature."""

    import asyncio

    for attempt in range(max_retries):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{NEAR_AI_BASE_URL}/signature/{chat_id}",
                    params={"model": model, "signing_algo": "ecdsa"},
                    headers={"Authorization": f"Bearer {NEAR_AI_API_KEY}"},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        sig_data = await response.json()
                        break
                    elif response.status == 404 and attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    else:
                        error_text = await response.text()
                        raise Exception(f"Signature fetch failed {response.status}: {error_text}")
        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
                continue
            raise
    else:
        raise Exception("Failed to fetch signature after retries")

    text = sig_data.get("text", "")
    signature = sig_data.get("signature", "")
    signing_address = sig_data.get("signing_address")
    signing_algo = sig_data.get("signing_algo", "ecdsa")

    expected_text = f"{request_hash}:{response_hash}"
    text_matches = (text == expected_text)

    # Debug logging
    if not text_matches:
        print(f"HASH MISMATCH!")
        print(f"Expected (Local): {expected_text}")
        print(f"Received (Remote): {text}")

    signature_valid = False
    recovered_address = None
    try:
        message = encode_defunct(text=text)
        recovered_address = Account.recover_message(message, signature=signature)
        signature_valid = recovered_address.lower() == signing_address.lower()
    except Exception as e:
        print(f"Signature verification error: {e}")
        signature_valid = False

    proof = {
        "type": "verification_proof",
        "node": origin_node,
        "chat_id": chat_id,
        "request_hash": request_hash,
        "response_hash": response_hash,
        "verified": text_matches and signature_valid,
        "signing_address": signing_address,
        "recovered_address": recovered_address,
        "signature": signature,
        "signing_algo": signing_algo,
        "text_matches": text_matches,
        "signature_valid": signature_valid
    }

    return proof