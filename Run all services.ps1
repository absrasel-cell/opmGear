Write-Host "Starting CustomCap Development Environment..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: npm is not installed or not in PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting all services..." -ForegroundColor Yellow

# Start Prisma Studio
Write-Host "Starting Prisma Studio..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx prisma studio"

# Wait a moment
Start-Sleep -Seconds 3

# Start Sanity Studio
Write-Host "Starting Sanity Studio..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx sanity dev"

# Wait a moment
Start-Sleep -Seconds 3

# Start Next.js Development Server
Write-Host "Starting Next.js Development Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "All services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Services will be available at:" -ForegroundColor White
Write-Host "- Next.js App: http://localhost:3000" -ForegroundColor Yellow
Write-Host "- Sanity Studio: http://localhost:3333" -ForegroundColor Yellow
Write-Host "- Prisma Studio: http://localhost:5555" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to close this window..." -ForegroundColor Gray
Read-Host