"""
Admin Portal Backend API
Runs on port 9000. Receives tickets from the edge chatbot, classifies them
with the ML engine, and serves data to the admin dashboard.
"""

import sys
import os
import uuid
import json
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Add ml-engine to path so we can import the classifier
ML_ENGINE_PATH = os.path.join(os.path.dirname(__file__), "..", "ml-engine")
sys.path.insert(0, os.path.abspath(ML_ENGINE_PATH))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Admin Portal API",
    description="Cloud-side ticket management and ML classification portal.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory ticket store (use a DB in production) ---
TICKETS: list[dict] = []

# --- Load ML classifier lazily ---
_classifier = None


def get_classifier():
    global _classifier
    if _classifier is None:
        try:
            from classifier import classify, get_label_description
            _classifier = {"classify": classify, "describe": get_label_description}
            logger.info("ML classifier loaded successfully.")
        except Exception as e:
            logger.warning(f"ML classifier unavailable: {e}. Tickets will be unclassified.")
            _classifier = None
    return _classifier


# --- Pydantic Models ---

class IncomingTicket(BaseModel):
    user_name: str
    user_email: str
    issue_description: str
    chat_context: Optional[str] = ""
    priority: Optional[str] = "Normal"


class TicketStatusUpdate(BaseModel):
    status: str  # "Open", "In Progress", "Resolved", "Closed"


# --- Endpoints ---

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "admin-portal-api", "port": 9000}


@app.post("/receive-ticket", status_code=201)
async def receive_ticket(ticket: IncomingTicket):
    """
    Receive a ticket from the edge chatbot, classify it with ML, and store it.
    """
    ticket_id = uuid.uuid4().hex[:8].upper()
    created_at = datetime.utcnow().isoformat() + "Z"

    # Run ML classification
    ml_label = "Unclassified"
    ml_confidence = 0.0
    ml_probabilities = {}
    ml_model_used = "N/A"
    label_description = "ML model not available."

    clf = get_classifier()
    if clf:
        try:
            result = clf["classify"](ticket.issue_description)
            ml_label = result["label"]
            ml_confidence = result["confidence"]
            ml_probabilities = result["all_probabilities"]
            ml_model_used = "Best Trained Model"
            label_description = clf["describe"](ml_label)
        except Exception as e:
            logger.error(f"Classification error: {e}")

    ticket_record = {
        "ticket_id": ticket_id,
        "user_name": ticket.user_name,
        "user_email": ticket.user_email,
        "issue_description": ticket.issue_description,
        "chat_context": ticket.chat_context,
        "priority": ticket.priority,
        "ml_label": ml_label,
        "ml_confidence": ml_confidence,
        "ml_probabilities": ml_probabilities,
        "ml_model_used": ml_model_used,
        "label_description": label_description,
        "status": "Open",
        "created_at": created_at,
        "updated_at": created_at,
    }

    TICKETS.append(ticket_record)
    logger.info(f"✅ Ticket {ticket_id} created — ML Label: {ml_label} (conf={ml_confidence})")

    return {
        "ticket_id": ticket_id,
        "ml_label": ml_label,
        "ml_confidence": ml_confidence,
        "label_description": label_description,
        "message": f"Ticket {ticket_id} received and classified as {ml_label}.",
    }


@app.get("/tickets")
async def get_tickets(status: Optional[str] = None, label: Optional[str] = None):
    """Return all tickets, optionally filtered by status or ML label."""
    tickets = TICKETS
    if status:
        tickets = [t for t in tickets if t["status"].lower() == status.lower()]
    if label:
        tickets = [t for t in tickets if t["ml_label"] == label.upper()]
    return {"total": len(tickets), "tickets": tickets}


@app.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    """Return a single ticket by ID."""
    ticket = next((t for t in TICKETS if t["ticket_id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    return ticket


@app.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, update: TicketStatusUpdate):
    """Update the status of a ticket."""
    valid_statuses = {"Open", "In Progress", "Resolved", "Closed"}
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    for ticket in TICKETS:
        if ticket["ticket_id"] == ticket_id:
            ticket["status"] = update.status
            ticket["updated_at"] = datetime.utcnow().isoformat() + "Z"
            return {"ticket_id": ticket_id, "new_status": update.status}

    raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")


@app.get("/ml-report")
async def get_ml_report():
    """Return the latest ML model comparison report."""
    report_path = os.path.join(ML_ENGINE_PATH, "models", "comparison_report.json")
    if not os.path.exists(report_path):
        return {
            "error": "No ML report found. Run model_trainer.py first.",
            "instructions": "cd admin-portal-web/ml-engine && python data_generator.py && python model_trainer.py",
        }
    with open(report_path) as f:
        return json.load(f)


@app.get("/stats")
async def get_stats():
    """Return ticket count statistics per label and status."""
    label_counts = {"L1": 0, "L2": 0, "L3": 0, "Unclassified": 0}
    status_counts = {"Open": 0, "In Progress": 0, "Resolved": 0, "Closed": 0}

    for t in TICKETS:
        lbl = t.get("ml_label", "Unclassified")
        label_counts[lbl] = label_counts.get(lbl, 0) + 1
        st = t.get("status", "Open")
        status_counts[st] = status_counts.get(st, 0) + 1

    return {
        "total_tickets": len(TICKETS),
        "by_label": label_counts,
        "by_status": status_counts,
    }
