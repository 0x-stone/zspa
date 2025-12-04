from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .import auth
import uvicorn

from .database import engine, Base
from .routers import users, fundraisers, donations
from .config import settings
from typing import Optional
import json
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.checkpoint.memory import InMemorySaver
from .agent  import workflow
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from .database import get_db
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from .tee_client import *



graph = None

import aiosqlite
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
db_path = "state_db/example.db"



async def setup_memory():
    conn = await aiosqlite.connect(db_path)
    memory = AsyncSqliteSaver(conn)
    return memory

async def create_all_indexes(engine: AsyncEngine):
    """
    Create all performance indexes for search and user operations.
    Run this once after initial migration.
    """
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_status ON fundraisers(status)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_trust_score ON fundraisers(trust_score DESC)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_created_at ON fundraisers(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_country ON fundraisers(country)",
        "CREATE INDEX IF NOT EXISTS idx_cause_updates_cause_id ON cause_updates(cause_id)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_status_trust ON fundraisers(status, trust_score DESC)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_status_created ON fundraisers(status, created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_fundraisers_user_id ON fundraisers(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_donations_fundraiser_id ON donations(fundraiser_id)",
    ]
    
    async with engine.begin() as conn:
        for idx_sql in indexes:
            try:
                await conn.execute(text(idx_sql))
                print(f"Created index: {idx_sql.split('idx_')[1].split(' ')[0]}")
            except Exception as e:
                print(f"Index creation failed (may already exist): {e}")
    
        print("All indexes created successfully")



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created/verified")


    await create_all_indexes(engine)

    global graph
    checkpointer = InMemorySaver()
    graph = workflow.compile(checkpointer=checkpointer)

    global client
    config = TEEConfig(
        api_key=settings.NEAR_AI_API_KEY,
        model="openai/gpt-oss-120b"
    )
    client = PrivateNEARAIClient(config)
    await client.initialize()

    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="ZEC Philanthropy Agent",
    description="Backend for private, AI-powered charitable giving with ZEC",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "ZEC Philanthropy Agent", "status": "healthy"}


@app.get("/tee/privacy-status")
async def get_privacy_status():
    """
    Get TEE verification status to show users.
    """
    if not client:
        raise HTTPException(status_code=503, detail="TEE client not initialized")
    return client.get_privacy_info()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Routes
app.include_router(users.router, prefix="/api/v1")
app.include_router(fundraisers.router, prefix="/api/v1")
app.include_router(donations.router, prefix="/api/v1")



class ChatRequest(BaseModel):
    message: Optional[str] = ""
    session_id: str
    refund_address:Optional[str]=""
    user_interests:list = []
    verify_donation:Optional[bool] = False
    cause_id:Optional[str] = None
    update_shielded_address: Optional[bool]=False

def get_initial_state(refund_address, interests):
    return {
        "user_interests":interests,
        "messages": [],
        "user_intent": "",
        "intent_type": "",
        "source_token": "ZEC",
        "destination_token": "ZEC",
        "amount": "",
        "refund_address": refund_address,
        "destination_recipient_address": "",
        "origin_asset_id": "",
        "destination_asset_id": "",
        "quote_response": {},
        "deposit_address": "",
        "deposit_memo": "",
        "cause_query": "",
        "discovered_causes": [],
        "selected_cause": {},
        "missing_fields": [],
        "requires_user_input": False,
        "awaiting_cause_selection": False,
        "privacy_score": 95,
        "error": "",
        "current_step": ""
    }

def sse(data: dict):
    """Format Server-Sent Event"""
    return f"data: {json.dumps(data)}\n\n"

@app.post("/api/v1/chat")
async def chat_stream(request: ChatRequest):
    thread_id = request.session_id
    refund_address=request.refund_address or ""
    user_interests=request.user_interests or []
    cause_id=request.cause_id
    config = {"configurable": {"thread_id": thread_id}, }
    try:
        state = graph.get_state(config).values
        if not state:
            state = get_initial_state(refund_address, user_interests)
    except:
        state = get_initial_state(refund_address, user_interests)
    state["verify_donation"]= request.verify_donation
    state["refund_address"]= refund_address 
    state["user_interests"]= user_interests 
    state["cause_id"]= cause_id
    state["updating_shielded_address"]= request.update_shielded_address
    if request.verify_donation:
        state["polling_retries"]=0
    if request.message:
        state["messages"].append(HumanMessage(content=request.message))

    async def event_stream():
        try:
            yield sse({"type": "status", "message": "NEAR AI Agent connected (TEE-verified)..."})

            async for mode, payload in graph.astream(
                state, 
                config=config, 
                stream_mode=["updates", "messages"]
            ):
                if mode == "updates":
                    for node_name, node_state in payload.items():
                        if node_name == "verify_node":
                            continue
                        
                        step_title = node_name.replace("_", " ").title()
                        yield sse({
                            "type": "step",
                            "step": node_name,
                            "message": f"Completed: {step_title}"
                        })
                elif mode == "messages":
                    message_chunk, metadata = payload
                    if isinstance(message_chunk, ToolMessage):
                        if message_chunk.name == "verification_proof":
                            try:
                                proof = json.loads(message_chunk.content)
                                yield sse({
                                    "type": "verification",
                                    "proof": proof
                                })
                                verified_icon = "verified" if proof.get("verified") else "not verified"
                                yield sse({
                                    "type": "status",
                                    "message": f"{verified_icon} TEE Verification for {proof.get('node', 'unknown')}: {'PASSED' if proof.get('verified') else 'FAILED'}"
                                })
                            except json.JSONDecodeError:
                                pass
                        elif message_chunk.name == "error_occured":
                            try:
                                error=json.loads(message_chunk.content)
                                yield sse({
                                    "type": "error",
                                    "error": error
                                })
                            except  json.JSONDecodeError:
                                pass
                        elif message_chunk.name == "payment_status":
                            try:
                                status_data = json.loads(message_chunk.content)
                                yield sse({
                                    "type": "payment_status",
                                    "status": status_data.get("status"),
                                    "message": status_data.get("message")
                                })
                            except Exception as e:
                                pass
                                print(f"Error parsing payment status: {e}")

                    
                    # B. ASSISTANT CONTENT (Stream tokens)
                    elif isinstance(message_chunk, AIMessage):
                        if message_chunk.content:
                            yield sse({
                                "type": "content",
                                "content": message_chunk.content,
                                "node":metadata.get("langgraph_node")
                            })

            # Completion
            yield sse({"type": "status", "message": "Response Complete (All verifications emitted)"})
            yield "data: [DONE]\n\n"

        except Exception as e:
            yield sse({"type": "error", "message": str(e)})
            import traceback
            #print(traceback.format_exc())

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


