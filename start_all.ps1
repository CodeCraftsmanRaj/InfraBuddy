# start_all.ps1
# Script to start all 4 servers for the Edge Support System in parallel

Write-Host "Starting Edge Support System Servers..." -ForegroundColor Green

$basePath = (Get-Item .).FullName

# Start Admin Portal API
Write-Host "Starting Admin Portal API on port 9000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$basePath\admin-portal-web\portal-api'; .\.venv\Scripts\Activate.ps1; uv run uvicorn main:app --port 9000 --reload`""

# Start Admin Portal Dashboard
Write-Host "Starting Admin Portal Dashboard on port 5174..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$basePath\admin-portal-web\dashboard-ui'; .\bun\bun.exe run dev`""

# Start Edge Chatbot Backend
Write-Host "Starting Edge Chatbot API on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$basePath\edge-chatbot-app\backend-api'; .\.venv\Scripts\Activate.ps1; uv run uvicorn main:app --port 8000 --reload`""

# Start Edge Chatbot Frontend
Write-Host "Starting Edge Chatbot UI on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$basePath\edge-chatbot-app\frontend-ui'; ..\..\admin-portal-web\dashboard-ui\bun\bun.exe run dev`""

Write-Host "All servers are starting up in separate windows!" -ForegroundColor Green
Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
