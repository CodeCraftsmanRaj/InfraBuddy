# Navigation Guide

Welcome to the **Edge Support System**! This guide will help you navigate and interact with the different components of the system.

## Starting the System

To start all components of the system at once, simply open a PowerShell window and run the provided startup script:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\start_all.ps1
```

This will launch four separate PowerShell windows, each running a component of the system.

*(Note: The ML Engine model training must have been run at least once before starting the system so that the Admin Portal Backend has a model to use. You can do this by running `uv run python .\admin-portal-web\ml-engine\data_generator.py` and `uv run python .\admin-portal-web\ml-engine\model_trainer.py`)*

## accessing the UIs

### 1. Edge Chatbot Frontend (For Users)
- **URL**: [http://localhost:5173](http://localhost:5173)
- **Purpose**: This is the interface that employees/users interact with.
- **Functionality**:
    - Ask technical support questions to the AI, which runs locally using Ollama.
    - If the AI cannot resolve the issue, you can use this interface to raise a support ticket.

### 2. Admin Portal Dashboard (For IT Support/Admins)
- **URL**: [http://localhost:5174](http://localhost:5174)
- **Purpose**: This is the cloud-based dashboard used by the IT support team.
- **Functionality**:
    - View and manage incoming support tickets.
    - View the severity level (L1, L2, L3) automatically assigned to each ticket by the Machine Learning Engine.

## Accessing the APIs (For Developers)

Both backend services provide automatically generated Swagger documentation where you can test the API endpoints directly from your browser.

### 1. Edge Chatbot Backend API
- **URL**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Purpose**: Handles requests from the Edge Chatbot Frontend, communicates with the local Ollama instance, and forwards ticket creation requests to the Admin Portal API.

### 2. Admin Portal Backend API
- **URL**: [http://localhost:9000/docs](http://localhost:9000/docs)
- **Purpose**: Handles ticket creation, stores tickets, and uses the Machine Learning Engine to classify the severity of incoming tickets.
