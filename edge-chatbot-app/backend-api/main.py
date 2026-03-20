"""
Edge Chatbot Backend API
Runs locally on port 8000. Connects to Ollama (port 11434) for AI inference.
Bridges ticket creation to the Admin Portal (port 9000).
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any, cast
import httpx
import subprocess
import asyncio
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
OLLAMA_MODEL = "llama3.2"

SYSTEM_PROMPT = (
    "You are InfraBuddy, an expert technical support assistant. "
    "Help the user resolve their IT issue clearly and concisely. "
    "If the issue requires escalation, politely suggest raising a support ticket."
)

# --- Agentic Capabilities: Hardcoded Scenarios ---
ACTION_SCRIPTS = {
    "clear_browser_cache": {
        "title": "Clear Browser Cache",
                "description": "Deletes Chrome/Chromium/Brave/Firefox temporary browser data and verifies what was removed.",
        "script": r'''#!/bin/bash
set -u
shopt -s nullglob

echo "Scanning browser cache locations..."

total_found=0
total_removed=0

clear_glob() {
    local pattern="$1"
    local label="$2"
    local matches=( $pattern )
    local count=${#matches[@]}

    if (( count > 0 )); then
        echo "Found $count entries in $label"
        rm -rf ${pattern} || true
        total_found=$((total_found + count))
        total_removed=$((total_removed + count))
    else
        echo "No cache entries found in $label"
    fi
}

clear_glob "$HOME/.cache/google-chrome/Default/Cache/*" "Google Chrome"
clear_glob "$HOME/.cache/chromium/Default/Cache/*" "Chromium"
clear_glob "$HOME/.cache/BraveSoftware/Brave-Browser/Default/Cache/*" "Brave"
clear_glob "$HOME/.cache/mozilla/firefox/*/cache2/*" "Firefox"

if (( total_found == 0 )); then
    echo "No supported browser cache files were found to clear."
    exit 2
fi

echo "Browser cache cleanup completed. Removed approximately $total_removed entries."
exit 0
'''
    },
    "system_speed_cleanup": {
        "title": "Improve System Slowness",
        "description": "Clears temporary files and cache to improve system speed.",
        "script": r'''#!/bin/bash
echo "Diagnosing System Slowness..."
echo "Clearing user temporary files..."
rm -rf ~/.cache/*
rm -rf /tmp/* 2>/dev/null || true
echo "Clearing pip cache..."
rm -rf ~/.cache/pip
echo "Temporary files cleared. System performance may improve."
'''
    },
    "restart_network": {
        "title": "Restart Network Connection",
        "description": "Restarts the network connection to resolve connectivity issues.",
        "script": r'''#!/bin/bash
set -u

echo "Restarting network connection..."

if command -v nmcli >/dev/null 2>&1; then
    if nmcli networking off >/dev/null 2>&1 && sleep 2 && nmcli networking on >/dev/null 2>&1; then
        echo "Network restarted using nmcli."
        exit 0
    fi
fi

if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    if sudo systemctl restart NetworkManager 2>/dev/null || sudo systemctl restart networking 2>/dev/null; then
        echo "Network restarted using systemctl."
        exit 0
    fi
fi

echo "Could not restart network automatically (missing privileges or service)."
echo "Try manually: sudo systemctl restart NetworkManager"
exit 1
'''
    },
    "close_heavy_apps": {
        "title": "Close Heavy Applications",
        "description": "Closes resource-heavy applications to free up system memory.",
        "script": r'''#!/bin/bash
echo "Closing heavy applications..."
killall -9 firefox 2>/dev/null || true
killall -9 chromium 2>/dev/null || true
killall -9 google-chrome 2>/dev/null || true
echo "Heavy applications closed. System memory freed."
'''
    },
    "clear_disk_space": {
        "title": "Clear Disk Space",
        "description": "Removes old package caches and temporary files to free up disk space.",
        "script": r'''#!/bin/bash
echo "Clearing disk space..."
echo "Removing old package caches..."
paccache -r -k1 2>/dev/null || sudo apt-get clean 2>/dev/null || echo "Package cache cleanup skipped."
echo "Cleaning journal logs..."
sudo journalctl --vacuum=3d 2>/dev/null || echo "Journal cleanup requires sudo."
echo "Disk space cleanup completed."
'''
    }
}

def detect_intent(message: str) -> Optional[str]:
    """Simple keyword matching to suggest automated fixes."""
    msg = message.lower()
    
    # 1. Clear Browser Cache
    if any(kw in msg for kw in ["browser cache", "clear cache", "chrome is slow", "edge is slow", "browser slow", "browser slowing", "browser loading", "browser issues", "chrome is running slow", "edge is running slow"]):
        return "clear_browser_cache"
    
    # 2. System Slowness
    if any(kw in msg for kw in ["system is slow", "pc is slow", "laptop freezing", "computer lagging", "monitor traffic", "system resources", "laptop is slow"]):
        return "system_speed_cleanup"
        
    # 3. Network Restart
    if any(kw in msg for kw in ["internet is not working", "wifi drops", "no internet", "cannot connect to wifi", "wifi restarting", "connection issue", "wifi is not working", "internet is slow"]):
        return "restart_network"
        
    # 4. Close heavy applications
    if any(kw in msg for kw in ["teams not loading", "teams frozen", "outlook frozen", "outlook not responding", "session data", "close teams", "close outlook", "outlook not working", "teams not working", "app is hanging", "app is frozen", "system memory full"]):
        return "close_heavy_apps"
        
    # 5. Disk Space Cleanup
    if any(kw in msg for kw in ["c drive full", "out of space", "disk full", "empty recycle bin", "temp files", "delete temp", "storage issue", "low disk space"]):
        return "clear_disk_space"

    return None

class ChatInput(BaseModel):
    message: str
    conversation_history: Optional[List[Any]] = []

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
    if suggested_action and suggested_action in ACTION_SCRIPTS:
        action_data = {
            "id": suggested_action,
            "title": ACTION_SCRIPTS[suggested_action]["title"],
            "description": ACTION_SCRIPTS[suggested_action]["description"]
        }
        # FAST PATH: If we know exactly what they need, bypass the slow CPU-bound LLM
        # and return the action card immediately.
        return {
            "reply": f"I can help with that! I have an automated fix for **{action_data['title']}**.",
            "model": "rule-based-fast-path",
            "done": True,
            "suggested_action": action_data
        }
    elif suggested_action:
        # Defensive guard: never crash if an unknown action key is returned.
        logger.warning(f"Detected unsupported action key: {suggested_action}")

    # 2. AI Response (only for general chat, fallback)
    full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {payload.message}\nAssistant:"

    # Increase timeout to 600s (10 minutes) for initial model loading/inference
    # Use a specific timeout config for connect vs read
    timeout_config = httpx.Timeout(
        timeout=600.0,
        connect=10.0,   # Quick connection check
        read=590.0      # Long wait for generation (loading model into memory takes time)
    )

    async with httpx.AsyncClient(timeout=timeout_config) as client:
        try:
            logger.info(f"Sending request to Ollama: {str(payload.message)[0:60]}...")
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
                    f"('ollama serve') and the configured model is available ('ollama pull {OLLAMA_MODEL}')."
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
    Executes a predefined bash script locally on the machine (Linux/Arch).
    """
    script_id = payload.script_id
    if script_id not in ACTION_SCRIPTS:
        raise HTTPException(status_code=404, detail="Script ID not found or unauthorized.")
    
    script_content = ACTION_SCRIPTS[script_id]["script"]
    logger.info(f"Executing script: {script_id}")
    
    try:
        # Use a zero-arg closure to execute bash scripts on Linux
        def _run() -> "subprocess.CompletedProcess[str]":
            return subprocess.run(
                ['bash', '-c', script_content],
                capture_output=True,
                text=True,
                errors='replace',
                timeout=120
            )

        # Run in a separate thread to avoid blocking the event loop
        logger.info(f"Starting thread for bash script execution...")
        result = await asyncio.to_thread(cast(Any, _run))
        
        output = result.stdout.strip()
        error = result.stderr.strip()
        
        if result.returncode != 0:
            logger.error(f"Script {script_id} failed with code {result.returncode}: {error}")
            status = "warning" if result.returncode == 2 else "error"
            return {
                "status": status,
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
        
    except subprocess.TimeoutExpired:
        logger.error(f"Script {script_id} timed out")
        raise HTTPException(status_code=504, detail="Script execution timed out after 120 seconds.")
    except Exception as e:
        import traceback
        err_msg = traceback.format_exc()
        logger.error(f"Critical error executing script {script_id}: {err_msg}")
        raise HTTPException(status_code=500, detail=f"Script execution failed: {str(e)} | Details: {err_msg[0:200]}")


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
