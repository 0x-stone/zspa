import aiohttp
import asyncio
from typing import TypedDict, Annotated, Literal, Optional, List
from langgraph.graph import StateGraph, END
from langgraph.graph.message import MessagesState
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import operator
import json
from langgraph.types import Command, Send
from .near_inference import NEARInference, verify_inference
from .search import search_and_rank_fundraisers
from . import schemas, crud, score_util
from .database import get_db
from .config import settings
import uuid
from . import crud

# API endpoint for cross-chain swaps
ONE_CLICK_BASE_URL = "https://1click.chaindefuser.com"

# Initialize NEAR AI inference engine
near_llm = NEARInference(model="openai/gpt-oss-120b")

# Main state object passed between graph nodes
# Tracks conversation history, transaction details, and flow control flags
class AgentState(MessagesState):
    updating_shielded_address: bool
    cause_id: str
    user_interests: dict
    intent_type: str
    verify_donation: bool
    source_token: str
    amount: str
    amount_usd: str
    refund_address: str
    
    # Asset IDs for the swap provider
    origin_asset_id: str
    destination_asset_id: str
    
    quote_response: dict
    deposit_address: str
    deposit_memo: str
    
    cause_query: str
    discovered_causes: list
    selected_cause: dict
    
    requires_user_input: bool
    awaiting_cause_selection: bool
    privacy_score: int
    error: str
    current_step: str

    text_query: str
    location: str
    tags: list[str]
    polling_retries: int 

# Structured output models for LLM responses
class IntentClassification(BaseModel):
    intent_type: Literal["question", "discover_causes", "operations"]
    confidence: float

class CauseIntent(BaseModel):
    source_token: str = "ZEC"
    amount: Optional[float] = None
    text_query: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[List[str]] = None

class CauseSelection(BaseModel):
    selection_index: Optional[int] = None
    selection_name: Optional[str] = None

# Fetches available tokens for swapping from external API
async def get_supported_tokens_async() -> dict:
    """Fetch supported tokens from 1-click API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{ONE_CLICK_BASE_URL}/v0/tokens", timeout=10) as response:
                if response.status == 200:
                    tokens = await response.json()
                    formatted = []
                    for token in tokens:
                        formatted.append({
                            "symbol": token.get("symbol"),
                            "blockchain": token.get("blockchain"),
                            "assetId": token.get("assetId"),
                            "decimals": token.get("decimals"),
                            "price": token.get("price")
                        })
                    return {"success": True, "data": formatted}
                return {"success": False, "error": f"HTTP {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

# Generates a swap quote to convert user assets to ZEC
async def request_swap_quote_async(
    origin_asset: str,
    destination_asset: str,
    amount: str,
    refund_to: str,
    recipient: str,
    dry_run: bool = False
) -> dict:
    """Request swap quote from 1-click API"""
    try:
        deadline = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
        
        payload = {
            "dry": dry_run,
            "depositMode": "SIMPLE",
            "swapType": "EXACT_INPUT",
            "slippageTolerance": 100,
            "originAsset": origin_asset,
            "depositType": "ORIGIN_CHAIN",
            "destinationAsset": destination_asset,
            "amount": amount,
            "refundTo": refund_to,
            "refundType": "ORIGIN_CHAIN",
            "recipient": recipient,
            "recipientType": "DESTINATION_CHAIN",
            "deadline": deadline,
            "referral": "zec-private-agent",
            "quoteWaitingTimeMs": 3000
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{ONE_CLICK_BASE_URL}/v0/quote",
                json=payload,
                timeout=15
            ) as response:
                data = await response.json()
                print("payment", data)
                if response.status == 201:
                    return {"success": True, "data": data}
                return {"success": False, "error": f"HTTP {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Helper to match user text input (e.g., "1", "Privacy Cause") to a cause list
def find_cause_by_selection(query: str, discovered_causes: list) -> Optional[dict]:
    """Match user selection to a cause"""
    query_clean = query.strip().lower()
    
    # Check if user selected by index number
    if query_clean.isdigit():
        idx = int(query_clean) - 1
        if 0 <= idx < len(discovered_causes):
            return discovered_causes[idx]
    
    # Check if user selected by name or ID
    for cause in discovered_causes:
        cause_dict = cause
        title = (cause_dict.get("title") or "").lower()
        display_name = (cause_dict.get("display_name") or "").lower()
        website_url = (cause_dict.get("website_url") or "").lower()
        cause_id = str(cause_dict.get("id") or "")

        if query_clean in title or query_clean in display_name:
            return cause_dict
        elif query_clean == cause_id:
            return cause_dict
        elif query_clean in website_url:
            return cause_dict
    
    return None

# First node in graph: determines if user is asking Qs, looking for causes, or donating
async def classify_intent_node_async(state: AgentState):
    """Classify user's intent using NEAR AI with streaming"""
    state["current_step"] = "classifying_intent"

    # Bypass classification if in verification or address update modes
    if state.get("verify_donation"):
        return state
    print("&"*100)
    print(state.get("discovered_causes"))
    if state.get("updating_shielded_address"):
        return state

    user_message = next(
        (m.content for m in reversed(state.get("messages", [])) if isinstance(m, HumanMessage)),
        ""
    )
    if user_message == "0.0001":
        print(state)
    
    # Direct ID lookup if cause_id is provided in state
    if state.get("cause_id"):
        async for db in get_db():
            cause = await crud.get_fundraiser(db, state.get("cause_id"))
            if not cause:
                state["messages"].append(AIMessage(content="Error: Could not find that fundraiser."))
                return state
            selection = schemas.FundraiserScoreResponse(
                id=str(cause.id),
                user_id=str(cause.user_id),
                created_at=cause.created_at,
                trust_score=cause.trust_score,
                title=cause.title,
                display_name=cause.display_name,
                short_description=cause.short_description,
                long_description=cause.long_description,
                image_url=cause.image_url,
                website_url=cause.website_url,
                social_links=cause.social_links,
                tags=cause.tags,
                wallet_address=cause.wallet_address,
                preferred_chain=cause.preferred_chain,
                preferred_token=cause.preferred_token,
                amount_raised=cause.amount_raised,
                goal_amount=cause.goal_amount,
                country=cause.country,
                city=cause.city,
                match_score=0.0, 
                activated=True
            ).model_dump()
            break
        state["intent_type"] = "operations"
        state["selected_cause"] = selection
        msg = f"Perfect! You've selected {selection['title']}.\n\n"
        state["messages"].append(AIMessage(content=msg))

        print("storing state selected cause", state.get("selected_cause"))
        return state

    # Handle selection if user was presented with a list of causes
    if state.get("awaiting_cause_selection") and state.get("discovered_causes"):
        selection = find_cause_by_selection(user_message, state["discovered_causes"])
        if selection:
            state["selected_cause"] = selection
            state["awaiting_cause_selection"] = False
            state["intent_type"] = "operations"
            msg = f"Perfect! You've selected **{selection['title']}**.\n\n"
            state["messages"].append(AIMessage(content=msg))
            return state
    
    # Prepare context for LLM by cleaning previous messages (removing complex JSON)
    previous_messages = state.get("messages", [])
    formatted_messages = []
    
    for msg in reversed(list(previous_messages)):
        # Skip ToolMessages entirely
        if msg.__class__.__name__ == "ToolMessage":
            continue
            
        content = getattr(msg, 'content', '')
        
        if isinstance(content, str) and '"type": "cause_list_with_summary"' in content:
            content = "These are available causes: please select one"
        
        if isinstance(content, str) and '"quote":' in content and '"deposit_addr":' in content:
            content = "Deposit into this address to complete your donation"
        
        msg_type = msg.__class__.__name__.replace('Message', '')
        formatted_messages.append(f"{msg_type}: {content}")
    
    formatted_context = "\n".join(formatted_messages)

    #print("formatted messages", formatted_context)
    #print("user message", user_message)
    
    system_prompt = f"""IMPORTANT: Analyze this previous context if available: {formatted_context}

Classify the user's intent into one of these categories:

1. "question" - User asking general questions about privacy or causes (e.g., "hi", "tell me more about the reava cause")
2. "discover_causes" - User explicitly states they want to donate to a cause or is looking to donate to a cause
3. "operations" - User is providing donation details like amount, refund address, or confirmation after a cause is already selected

Examples:
- "Tell me about privacy causes" -> question
- "I want to donate to EFF" -> discover_causes
- "6 ZEC" or "6" (when cause already selected) -> operations
- "zs1abc..." (providing an address) -> operations

Respond with JSON containing intent_type and confidence (0-1)."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    result = await near_llm.invoke_structured(
        messages=messages,
        response_model=IntentClassification
    )

    parsed = result["parsed"]
    state["intent_type"] = parsed.intent_type
    print("parsed", parsed)
    print(state.get("selected_cause") )
    
    # Return command updates state and triggers parallel verification proof
    return  Command(
        update={
            **state,
            "intent_type": parsed.intent_type,
            "selected_cause": state.get("selected_cause") 
        }, 

        goto=[
            Send("verify_inference_proof", {
                "chat_id": result["chat_id"],
                "request_hash": result["request_hash"],
                "response_hash": result["response_hash"],
                "origin_node": "classify_intent"
            })
        ]
    )


async def intent_parser_node_async(state: AgentState):
    """Parse user intent using NEAR AI"""
    state["current_step"] = "parsing_intent"
    
    user_message = next(
        (m.content for m in reversed(state.get("messages", [])) if isinstance(m, HumanMessage)),
        ""
    )

    system_prompt = """You are an intelligent Philanthropy Agent for the Zcash ecosystem. Your goal is to extract structured intent from this user message to query a database of fundraisers.

### OUTPUT FORMAT
You must respond ONLY with a valid JSON object matching this structure:
{
  "text_query": "string" | null,
  "location": "string" | null,
  "tags": ["string"] | null,
  "amount": float | null
}

### EXTRACTION LOGIC
1. **text_query**: This is the "Search Bar". Put specific project names ("OceanRescue"), specific needs ("laptops"), or distinct topics here. 
   - BAD: "I want to donate" -> text_query: "donate" (STOP. Don't do this).
   - GOOD: "I want to donate" -> text_query: null
   - GOOD: "Support privacy tools" -> text_query: "privacy tools"

2. **location**: Extract specific locations (City, Country, Region, Continent) all in lower case. 
   - "in Nigeria" -> location: "nigeria"

3. **amount**: Extract numeric donation amounts. Look for numbers followed by ZEC or standalone numbers in donation context.
   - "6 ZEC" -> amount: 6.0
   - "10" (in donation context) -> amount: 10.0
   - 0.001 
   - 0.1

### EXAMPLES
User: "I want to donate 10 ZEC to help orphans in Lagos"
JSON:
{
  "text_query": "orphans",
  "location": "lagos",
  "tags": ["orphans", "children"],
  "amount": 10.0
}

User: "Find me trusted privacy tech projects"
JSON:
{
  "text_query": "privacy tech",
  "location": null,
  "tags": ["privacy", "security"],
  "amount": null
}

User: "6 ZEC"
JSON:
{
  "text_query": null,
  "location": null,
  "tags": null,
  "amount": 6.0
}

User: "0.1"
JSON:
{
  "text_query": null,
  "location": null,
  "tags": null,
  "amount": 0.1
}
"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    result = await near_llm.invoke_structured(
        messages=messages,
        response_model=CauseIntent 
    )
    
    parsed = result["parsed"].model_dump()
    
    if parsed.get("amount"):
        state["amount"] = parsed.get("amount")
    state["text_query"] = parsed.get("text_query")
    state["category"] = parsed.get("category")
    state["location"] = parsed.get("location")
    state["tags"] = parsed.get("tags")

    # Only ask for amount if we're in operations mode AND no cause is selected yet
    if state["intent_type"] == "operations" and not state.get("amount"):
        message = "How much ZEC would you like to donate?"
        state["messages"].append(AIMessage(content=message))
    print("parsed", parsed)
    print(state.get("selected_cause") )
    return Command(
        update={**state}, 
        goto=[
            Send("verify_inference_proof", {
                "chat_id": result["chat_id"],
                "request_hash": result["request_hash"],
                "response_hash": result["response_hash"],
                "origin_node": "parse_intent"
            })
        ]
    )


async def answer_question_node_async(state: AgentState):
    """Answer user questions using NEAR AI"""
    state["current_step"] = "answering_question"
    
    user_message = next(
        (m.content for m in reversed(state.get("messages", [])) if isinstance(m, HumanMessage)),
        ""
    )
    
    # Determine if the question requires a database search
    classification_prompt = f"""Does this question require searching the fundraiser database?

Question: "{user_message}"

Questions that NEED search:
- "What education causes are available?"
- "Tell me about privacy projects"
- Any question about specific causes/categories

Questions that DON'T need search:
- "Hi" / "Hello" / greetings
- "How does this work?"
- "What is ZEC?"
- "How do I donate?"
- General platform questions

Respond with JSON: {{"needs_search": true/false}}"""
    
    needs_search_result = await near_llm.invoke([
        {"role": "system", "content": "You classify if questions need database search."},
        {"role": "user", "content": classification_prompt}
    ])
    
    try:
        needs_search = json.loads(needs_search_result["content"]).get("needs_search", False)
    except:
        needs_search = False
    
    causes_context = ""
    # Perform DB search if needed to provide context to the LLM
    if needs_search:
        query = {
            "text_query": state.get("text_query"),
            "location": state.get("location"),
            "tags": state.get("tags"),
        }
        
        user_interests = state.get("user_interests", [])
        
        async for db in get_db():
            causes = await search_and_rank_fundraisers(
                db,
                schemas.FundraiserSearchRequest(**query),
                interests=user_interests
            )
            if causes:
                causes_context = "\n".join([
                    f"- {c['title']} (Trust: {c['trust_score']}/100, Category: {c.get('category', 'N/A')})"
                    for c in causes[:5]
                ])
            break
    
    if causes_context:
        system_prompt = f"""You are a helpful assistant for a private ZEC donation platform.

AVAILABLE CAUSES:
{causes_context}

Answer the user's question about these causes. Be helpful and encourage exploring them."""
    else:
        system_prompt = """You are a helpful assistant for a private ZEC donation platform.

PLATFORM FEATURES:
- Search verified fundraisers by cause, location, category
- Analyze trust scores (0-100) based on website verification, updates, social proof
- Execute private donations via ZEC shielded addresses (z-addresses)
- Cross-chain routing (ZEC -> any token/chain) while preserving privacy
- All AI operations run in NEAR Trusted Execution Environments (TEE)

PRIVACY BENEFITS:
- Donations use shielded z-addresses (sender stays anonymous)
- Cross-chain routing hides final destination
- AI recommendations computed in isolated TEE
- No tracking, no surveillance

Answer the user's question helpfully (2-3 sentences). If they seem interested in donating, suggest searching for causes."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    result = await near_llm.invoke(messages)
    state["messages"].append(AIMessage(content=result["content"]))
    
    return Command(
        update=state,
        goto=[Send("verify_inference_proof", {
            "chat_id": result["chat_id"],
            "request_hash": result["request_hash"],
            "response_hash": result["response_hash"],
            "origin_node": "answer_question"
        })]
    )


async def verify_inference_proof(data: dict):
    """
    Independent verification node that emits proof as ToolMessage.
    This runs in parallel and doesn't block the main graph.
    """
    chat_id = data.get("chat_id")
    request_hash = data.get("request_hash")
    response_hash = data.get("response_hash")
    origin_node = data.get("origin_node", "unknown")
    

    proof = await verify_inference(
        chat_id=chat_id,
        request_hash=request_hash,
        response_hash=response_hash,
        origin_node=origin_node
    )
    

    return {
        "messages": [ToolMessage(
            content=json.dumps(proof),
            tool_call_id=f"verify_{chat_id}",
            name="verification_proof"
        )]
    }


async def collect_missing_info_node_async(state: AgentState):
    """Prompt user for missing information"""
    state["current_step"] = "collecting_info"
    
    if state.get("refund_address"):
        return state
    
    prompts = {
        "refund_address": "Please provide your shielded ZEC address (z-address) for refunds.",
    }
    state["messages"].append(AIMessage(content=prompts))
    state["requires_user_input"] = True
    
    return state

async def cause_discovery_node_async(state: AgentState):
    """Find and rank philanthropy causes"""
    state["current_step"] = "discovering_causes"
    
    query = {
        "text_query": state.get("text_query"),
        "location": state.get("location"),
        "tags": state.get("tags"),
    }
    user_interests = state.get("user_interests", [])
    
    async for db in get_db():
        causes = await search_and_rank_fundraisers(
            db,
            schemas.FundraiserSearchRequest(**query),
            interests=user_interests
        )
        break
    
    if not causes:
        no_results_msg = {
            "type": "no_results",
            "message": "I couldn't find any active fundraisers matching your criteria. Try different keywords or a broader location."
        }
        state["messages"].append(AIMessage(content=json.dumps(no_results_msg)))
        return state
    
    state["discovered_causes"] = causes
    
    # Sanitize cause data for display (remove internal fields)
    clean_causes = []
    for cause in causes[:10]: 
        cause_display = cause.copy()
        cause_display.pop("preferred_chain", None)
        cause_display.pop("preferred_token", None)
        cause_display.pop("wallet_address", None)
        cause_display.pop("created_at", None)
        clean_causes.append(cause_display)
    

    top_3_summary = []
    for i, cause in enumerate(causes[:3]):
        top_3_summary.append({
            "rank": i + 1,
            "title": cause["title"],
            "trust_score": cause["trust_score"],
            "category": cause.get("category", ""),
            "location": f"{cause.get('city', '')}, {cause.get('country', '')}".strip(', '),
            "completion": int((cause["amount_raised"] / cause["goal_amount"]) * 100) if cause["goal_amount"] else 0,
            "short_description": cause.get("short_description", "")[:100]
        })
    
    summary_prompt = f"""You are a helpful philanthropy advisor. You just searched and found {len(causes)} fundraisers.

USER'S SEARCH:
- Query: "{state.get('text_query', 'causes')}"
- Location: "{state.get('location', 'anywhere')}"
- Interests: {state.get('user_interests', [])}

TOP 3 RESULTS (ranked by trust + relevance):
{json.dumps(top_3_summary, indent=2)}

TASK: Write a friendly, enthusiastic 2-3 sentence summary highlighting:
1. How many great matches you found
2. Call out 1-2 standout projects from the top 3 (mention names + why they're notable)
3. Encourage the user to explore the list

TONE: Warm, helpful, excited about the causes (not robotic)
LENGTH: 2 sentences MAX

Example:
"I found 7 verified projects! Clean Water Lagos looks excellent - it's 88% funded with a 92 trust score, so your donation could complete it. School Supplies Kenya also stands out with 23 quality updates. Take a look below and let me know which one resonates with you!"

Now write YOUR summary based on the actual data above:"""
    
    result = await near_llm.invoke([
        {"role": "system", "content": "You are an enthusiastic, helpful philanthropy advisor."},
        {"role": "user", "content": summary_prompt}
    ])
    
    summary_text = result["content"]
    response_data = {
        "type": "cause_list_with_summary",
        "summary": summary_text,
        "causes": clean_causes,
        "total_found": len(causes)
    }
    
    state["messages"].append(AIMessage(content=json.dumps(response_data)))
    state["awaiting_cause_selection"] = True
    state["requires_user_input"] = True
    
    return Command(
        update=state,
        goto=[Send("verify_inference_proof", {
            "chat_id": result["chat_id"],
            "request_hash": result["request_hash"],
            "response_hash": result["response_hash"],
            "origin_node": "cause_discovery"
        })]
    )

async def asset_resolver_node_async(state: AgentState):
    """Resolve token symbols to asset IDs"""
    state["current_step"] = "resolving_assets"
    cause= state.get("selected_cause")
    state["updating_shielded_address"]=False
    result = await get_supported_tokens_async()
    
    if not result["success"]:
        state["error"] = f"Failed to fetch tokens: {result['error']}"
        return state
    
    tokens = result["data"]
    origin_found = False
    dest_found = False
    
    # Match symbol strings to API asset IDs
    for token in tokens:
        symbol = token.get("symbol", "").upper()
        blockchain = token.get("blockchain", "").lower()
        
        if not origin_found and ("ZEC" in symbol and "zec" in blockchain):
            state["origin_asset_id"] = token["assetId"]
            origin_found = True
        if not dest_found and (cause["preferred_token"].upper() in symbol and cause["preferred_chain"].lower() in blockchain):
            state["destination_asset_id"] = token["assetId"]
            dest_found = True
        
        if origin_found and dest_found:
            break
    
    if not origin_found or not dest_found:
        state["error"] = f"Could not resolve tokens: -> {cause['preferred_token']}"
    
    return state

async def quote_generation_node_async(state: AgentState):
    """Generate swap quote"""
    state["current_step"] = "generating_quote"
    state["error"] =False
    recipient=None
    if state["intent_type"] == "operations" and state.get("selected_cause"):
        recipient = state["selected_cause"]["wallet_address"]
    
    if not recipient:
        state["error"] =True
        data = {
        "error_type":"quote_generation",
        "error":"No recipient address available"
        }
        return Command(update=state, goto=[Send("notify_on_error", data)])
    
    try:
        amount_float = float(state.get("amount"))
        amount_smallest = str(int(amount_float * 100000000))
    except:
        state["error"] = True
        data = {
        "error_type":"quote_generation",
        "error":"Invalid amount format"
        }
        return Command(update=state, goto=[Send("notify_on_error", data)])
    
    result = await request_swap_quote_async(
        origin_asset=state.get("origin_asset_id", ""),
        destination_asset=state.get("destination_asset_id", ""),
        amount=amount_smallest,
        refund_to=state.get("refund_address", ""),
        recipient=recipient,
        dry_run=False
    )
    
    if result["success"]:
        state["quote_response"] = result["data"]
        quote = result["data"].get("quote", {})
        state["deposit_address"] = quote.get("depositAddress", "")
        state["deposit_memo"] = quote.get("depositMemo", "")
        return state
    
    state["error"]=True
    data = {
        "error_type":"quote_generation",
        "error":f"Quote generation failed: {result['error']}"
        }
    return Command(update=state, goto=[Send("notify_on_error", data)])

    


async def final_instructions_node_async(state: AgentState):
    """Generate final transaction instructions"""
    state["current_step"] = "final_instructions"
    cause=state["selected_cause"].copy()
    cause.pop("preferred_chain")
    cause.pop("preferred_token")
    cause.pop("wallet_address")
    cause.pop("created_at")
    data={
        "quote":state.get("quote_response", {}).get("quote", {}),
        "deposit_addr":state.get("deposit_address", "N/A"),
        "cause":cause,
        "amount":state.get('amount'),
        "refund_address":state.get('refund_address'),
        "qr_code_data": f"zcash:{state['deposit_address']}?amount={state['amount']}"
    }    
    state["messages"].append(AIMessage(content=json.dumps(data)))
    state["requires_user_input"] = False
    
    return state

async def notify_on_error_node(state):
    return {
        "messages": [ToolMessage(
            content=json.dumps(state),
            tool_call_id=state.get("error_type"),
            name="error_occured"
        )]
    }

async def request_donation_status_async(
    depositMemo: str,
    depositAddress: str,
) -> dict:
    """Request swap status from 1-click API"""
    try:
        params = {
            "depositAddress": depositAddress,
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{ONE_CLICK_BASE_URL}/v0/status",
                params=params,
                timeout=15
            ) as response:
                data = await response.json()
                if response.status == 200:
                    return {"success": True, "status": data.get("status"), "amount_usd":data.get("swapDetails", {}).get("amountInUsd")}
                return {"success": False, "error": f"HTTP {response.status}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def end_shielded_address_update(state: AgentState):
    state["updating_shielded_address"]=False
    return state


async def check_donation_status_node(state: AgentState):
    memo = state.get("deposit_memo")
    address = state.get("deposit_address")
    retries = state.get("polling_retries", 0)
    result = await request_donation_status_async(memo, address)
    status = result.get("status", "UNKNOWN")
    
    status_messages = {
        "PENDING_DEPOSIT": "Waiting for deposit...",
        "PROCESSING": "Payment detected! Processing...",
        "INCOMPLETE_DEPOSIT": "Deposit incomplete",
        "SUCCESS": "Donation Confirmed!",
        "TIMEOUT":"Timeout reached"
    }
    
    if result.get("success") and status == "SUCCESS":
        fundraiser = state.get("selected_cause")
        async for db in get_db():
            donation = schemas.DonationCreate(
                fundraiser_id=fundraiser.get("id"), 
                amount_zec=float(state.get("amount")), 
                amount= float(result.get("amount_usd"))
            )
            await crud.create_donation(db, donation)
            break
            
        success_msg = ToolMessage(
            content=json.dumps({"status": "SUCCESS", "message": "Donation verified successfully!"}),
            name="payment_status",
            tool_call_id=str(uuid.uuid4())
        )
        return {"messages": [success_msg]}

    max_retries = settings.MAX_DONATION_STATUS_POLL
    if retries >= max_retries:
        status = "TIMEOUT"
        display_text = status_messages.get(status, "Timeout reached")
        status_msg = ToolMessage(
            content=json.dumps({"status": status, "message": display_text}),
            name="payment_status",
            tool_call_id=str(uuid.uuid4())
        )
        return {"messages": [status_msg]}
        
    display_text = status_messages.get(status, f"Status: {status}")
    status_msg = ToolMessage(
        content=json.dumps({"status": status, "message": display_text}),
        name="payment_status",
        tool_call_id=str(uuid.uuid4())
    )
    
    await asyncio.sleep(settings.DONATION_STATUS_POLL_INTERVAL)
    return Command(
        goto="verify_donation_node",
        update={
            "messages": [status_msg],
            "polling_retries": retries + 1
        }
    )


workflow = StateGraph(AgentState)

# Add nodes to graph
workflow.add_node("classify_intent", classify_intent_node_async)
workflow.add_node("parse_intent", intent_parser_node_async)
workflow.add_node("answer_question", answer_question_node_async)
workflow.add_node("collect_info", collect_missing_info_node_async)
workflow.add_node("discover_causes", cause_discovery_node_async)
workflow.add_node("resolve_assets", asset_resolver_node_async)
workflow.add_node("generate_quote", quote_generation_node_async)
workflow.add_node("final_instructions", final_instructions_node_async)
workflow.add_node("notify_on_error", notify_on_error_node)
workflow.add_node("verify_inference_proof", verify_inference_proof)
workflow.add_node("verify_donation_node", check_donation_status_node)
workflow.add_node("end_shielded_address_update", end_shielded_address_update)

workflow.set_entry_point("classify_intent")

def route_after_classification(state: AgentState):
    """Route after intent classification"""
    if state.get("updating_shielded_address") and state.get("selected_cause"):
        return "resolve"
    if state.get("updating_shielded_address") and not state.get("selected_cause"):
        return "end"
    if state.get("verify_donation"):
        return "verify"
    
    intent = state.get("intent_type")
    
    # If a cause is already selected and user provides an amount, go to operations
    if intent == "operations" and state.get("selected_cause"):
        print("found in classification")
        return "parse"
    
    if intent == "question":
        return "answer"
    
    if intent == "discover_causes":
        print("found in classification discover causes")
        return "parse"
    
    # Default operations flow
    return "parse"


def route_after_parsing(state: AgentState):
    """Route after intent parsing"""
    #print("selected cause:", state.get("selected_cause"))
    #print("intent_type:", state.get("intent_type"))
    #print("amount:", state.get("amount"))
    #print("refund_address:", state.get("refund_address"))
    
    # If in operations mode with a selected cause
    if state["intent_type"] == "operations" and state.get("selected_cause"):
        print("checking amount first")
        # Need amount first
        if not state.get("amount"):
            return "end"
        # Need refund address
        if not state.get("refund_address"):
            return "collect"
        # Have everything, proceed to resolve
        return "resolve"
    
    # If in discover mode or operations without a cause, discover causes
    if state.get("intent_type") == "discover_causes":
        print("checking intent is discover")
        return "discover"
    
    if state["intent_type"] == "operations" and not state.get("selected_cause"):
        print("no selected_cause found")
        return "discover"
    
    return "end"


# Workflow edges
workflow.add_conditional_edges(
    "classify_intent",
    route_after_classification,
    {
        "answer": "answer_question", 
        "parse": "parse_intent", 
        "verify": "verify_donation_node", 
        "resolve": "resolve_assets", 
        "end": "end_shielded_address_update"
    }
)

workflow.add_conditional_edges(
    "parse_intent",
    route_after_parsing,
    {
        "discover": "discover_causes", 
        "collect": "collect_info", 
        "resolve": "resolve_assets", 
        "end": END
    }
)


workflow.add_edge("answer_question", END)
workflow.add_edge("collect_info", END)
workflow.add_edge("discover_causes", END)
workflow.add_edge("resolve_assets", "generate_quote")
workflow.add_edge("end_shielded_address_update", END)


def route_after_quote(state: AgentState):
    if state.get("error"):
        return "end"
    return "finalize"

workflow.add_conditional_edges(
    "generate_quote",
    route_after_quote,
    {"finalize": "final_instructions", "end": END}
)

workflow.add_edge("notify_on_error", END)
workflow.add_edge("final_instructions", END)
workflow.add_edge("verify_inference_proof", END)
workflow.add_edge("verify_donation_node", END)