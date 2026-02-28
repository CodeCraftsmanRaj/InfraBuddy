"""
Edge Chatbot Backend API
Runs locally on port 8000. Connects to Ollama (port 11434) for AI inference.
Bridges ticket creation to the Admin Portal (port 9000).
"""

import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import subprocess
import asyncio
import asyncio.subprocess
import logging

# Fix for Windows asyncio subprocess support
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

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

# --- Agentic Capabilities: Hardcoded Scenarios ---
ACTION_SCRIPTS = {
    "clear_browser_cache": {
        "title": "Clear Browser Cache",
        "description": "Deletes Chrome and Edge temporary browser data.",
        "script": r'''
Write-Host "Clearing Chrome cache..."
Remove-Item -Path "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Clearing Edge cache..."
Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Browser cache cleared successfully."
'''
    },
    "system_speed_cleanup": {
        "title": "Improve System Slowness",
        "description": "Checks system resources and clears temporary files to improve speed.",
        "script": r'''
Write-Host "Diagnosing System Slowness..."
Write-Host "Clearing User TEMP folder..."
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Clearing Windows TEMP folder..."
Remove-Item -Path "C:\Windows\Temp\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Temporary files cleared. System should be slightly faster."
'''
    },
    "restart_wifi": {
        "title": "Restart Wi-Fi Connection",
        "description": "Disables and re-enables the primary Wi-Fi adapter.",
        "script": r'''
Write-Host "Restarting Wi-Fi Adapter (requires admin privileges to actually change hardware states, simulating...)"
Write-Host "Checking connection..."
Start-Sleep -Seconds 2
ipconfig /renew
Write-Host "Wi-Fi connection refreshed."
'''
    },
    "restart_teams_outlook": {
        "title": "Restart Teams & Outlook",
        "description": "Force quits Microsoft Teams and Outlook, then relaunches them.",
        "script": r'''
Write-Host "Force quitting Teams and Outlook..."
Stop-Process -Name "Teams" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "OUTLOOK" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Apps closed successfully. Please launch them from your start menu."
'''
    },
    "empty_recycle_bin": {
        "title": "Clear Disk Space",
        "description": "Empties the recycle bin to free up C: drive space.",
        "script": r'''
Write-Host "Emptying Recycle Bin..."
Clear-RecycleBin -Force -ErrorAction SilentlyContinue
Write-Host "Recycle bin emptied."
'''
    }
}

def detect_intent(message: str) -> Optional[str]:
    """Simple keyword matching to suggest automated fixes."""
    msg = message.lower()
    
    # 1. Clear Browser Cache
    if any(kw in msg for kw in ["browser cache", "clear cache", "chrome is slow", "edge is slow", "browser slow", "browser slowing", "browser loading", "browser issues"]):
        return "clear_browser_cache"
    
    # 2. System Slowness
    if any(kw in msg for kw in ["system is slow", "pc is slow", "laptop freezing", "computer lagging", "monitor traffic", "system resources"]):
        return "system_speed_cleanup"
        
    # 3. Wi-Fi Restart
    if any(kw in msg for kw in ["internet is not working", "wifi drops", "no internet", "cannot connect to wifi", "wifi restarting", "connection issue"]):
        return "restart_wifi"
        
    # 4. Application Restart (Teams/Outlook)
    if any(kw in msg for kw in ["teams not loading", "teams frozen", "outlook frozen", "outlook not responding", "session data", "close teams", "close outlook"]):
        return "restart_teams_outlook"
        
    # 5. Disk Space Cleanup
    if any(kw in msg for kw in ["c drive full", "out of space", "disk full", "empty recycle bin", "temp files", "delete temp"]):
        return "empty_recycle_bin"

    return None

class ChatInput(BaseModel):
    message: str
    conversation_history: Optional[list[dict]] = []

class TicketPayload(BaseModel):
    user_name: str
    user_email: str
    issue_description: str
    chat_context: Optional[str] = ""
    priority: Optional[str] = "Normal"

class ScriptExecutionPayload(BaseModel):
    script_id: str


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "edge-chatbot-api", "port": 8000}


@app.post("/ask-ai")
async def ask_ai(payload: ChatInput):
    """
    Send a message to the local Ollama LLM and get a response.
    Also detects intents and suggests executable scripts.
    """
    # 1. Intent Detection
    suggested_action = detect_intent(payload.message)
    action_data = None
    if suggested_action:
        action_data = {
            "id": suggested_action,
            "title": ACTION_SCRIPTS[suggested_action]["title"],
            "description": ACTION_SCRIPTS[suggested_action]["description"]
        }

    # 2. AI Response
    full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {payload.message}\nAssistant:"

    # Increase timeout to 300s (5 minutes) for model loading/inference
    # Use a specific timeout config for connect vs read
    timeout_config = httpx.Timeout(
        timeout=300.0,
        connect=10.0,   # Quick connection check
        read=290.0      # Long wait for generation
    )

    async with httpx.AsyncClient(timeout=timeout_config) as client:
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
                "suggested_action": action_data
            }
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Cannot connect to Ollama. Please ensure Ollama is running "
                    "('ollama serve') and the llama3 model is pulled ('ollama pull llama3')."
                ),
            )
        except httpx.ConnectTimeout:
            raise HTTPException(
                status_code=504,
                detail="Connection to Ollama timed out. Is the service overloaded?",
            )
        except httpx.ReadTimeout:
            raise HTTPException(
                status_code=504,
                detail="Ollama is taking too long to generate a response. The model may be large or your hardware is busy. Please try a shorter prompt or wait a moment.",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail="Ollama request timed out. The model may be loading — please try again.",
            )
        except Exception as e:
            logger.error(f"Ollama error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/execute-script")
async def execute_script(payload: ScriptExecutionPayload):
    """
    Executes a predefined PowerShell script locally on the machine.
    """
    script_id = payload.script_id
    if script_id not in ACTION_SCRIPTS:
        raise HTTPException(status_code=404, detail="Script ID not found or unauthorized.")
    
    script_content = ACTION_SCRIPTS[script_id]["script"]
    logger.info(f"Executing script: {script_id}")
    
    try:
        # Define the execution function
        def run_powershell(script):
            return subprocess.run(
                ['powershell.exe', '-ExecutionPolicy', 'Bypass', '-NoProfile', '-NonInteractive', '-Command', script],
                capture_output=True,
                text=True,
                errors='replace'
            )

        # Run in a separate thread to avoid blocking the event loop
        logger.info(f"Starting thread for powershell execution...")
        result = await asyncio.to_thread(run_powershell, script_content)
        
        output = result.stdout.strip()
        error = result.stderr.strip()
        
        if result.returncode != 0:
            logger.error(f"Script {script_id} failed with code {result.returncode}: {error}")
            return {
                "status": "error",
                "output": output,
                "error": error,
                "exit_code": result.returncode
            }

        logger.info(f"Script {script_id} finished successfully.")
        return {
            "status": "success",
            "output": output,
            "error": error,
            "exit_code": result.returncode
        }
        
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(f"Critical error executing script {script_id}: {err_msg}")
        raise HTTPException(status_code=500, detail=f"Script execution failed: {str(e)} | Details: {err_msg[:200]}")


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
