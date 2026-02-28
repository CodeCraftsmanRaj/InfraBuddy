"""
Edge Chatbot Backend API
Runs locally on port 8000. Connects to Ollama (port 11434) for AI inference.
Bridges ticket creation to the Admin Portal (port 9000).
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Edge Chatbot API",
    description="Local AI chatbot backend using Ollama. No internet required for AI processing.",
    version="1.0.0",
)

# Allow requests from the local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
ADMIN_PORTAL_URL = "http://localhost:9000/receive-ticket"
OLLAMA_MODEL = "llama3"

SYSTEM_PROMPT = (
    "You are InfraBuddy, an expert technical support assistant. "
    "Help the user resolve their IT issue clearly and concisely. "
    "If the issue requires escalation, politely suggest raising a support ticket."
)


class ChatInput(BaseModel):
    message: str
    conversation_history: Optional[list[dict]] = []


class TicketPayload(BaseModel):
    user_name: str
    user_email: str
    issue_description: str
    chat_context: Optional[str] = ""
    priority: Optional[str] = "Normal"


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "edge-chatbot-api", "port": 8000}


@app.post("/ask-ai")
async def ask_ai(payload: ChatInput):
    """
    Send a message to the local Ollama LLM and get a response.
    Requires Ollama running locally with the llama3 model pulled.
    """
    full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {payload.message}\nAssistant:"

    async with httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
        try:
            logger.info(f"Sending request to Ollama: {str(payload.message)[:60]}...")
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": full_prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            result = response.json()
            ai_reply = result.get("response", "I could not generate a response.")
            logger.info("Ollama response received successfully.")
            return {
                "reply": ai_reply,
                "model": OLLAMA_MODEL,
                "done": result.get("done", True),
            }
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cannot connect to Ollama. Please ensure Ollama is running "
                    "('ollama serve') and the llama3 model is pulled ('ollama pull llama3')."
                ),
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="Ollama request timed out. The model may be loading — please try again.",
            )
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/bridge-to-portal")
async def raise_ticket(ticket: TicketPayload):
    """
    Forward a support ticket from the local chatbot to the Admin Portal.
    This is the bridge between the offline edge app and the internet-connected portal.
    """
    ticket_data = ticket.model_dump()
    logger.info(f"Bridging ticket to portal for: {ticket.user_email}")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                ADMIN_PORTAL_URL,
                json=ticket_data,
                timeout=30.0,
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Ticket submitted successfully. ID: {result.get('ticket_id')}")
            return result
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cannot connect to Admin Portal. "
                    "Ensure the portal API is running on port 9000."
                ),
            )
        except Exception as e:
            logger.error(f"Portal bridge error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
