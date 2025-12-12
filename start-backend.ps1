# Start Hunter Autoworks Backend Server
Write-Host "Starting Hunter Autoworks Backend Server..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location -Path "backend"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with the following content:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "JWT_SECRET=your_32_character_secret_here"
    Write-Host "PORT=5001"
    Write-Host "NODE_ENV=development"
    Write-Host ""
    Write-Host "Generate a JWT_SECRET with:" -ForegroundColor Yellow
    Write-Host "node -e `"console.log(require('crypto').randomBytes(32).toString('base64'))`""
    exit 1
}

# Start the server
Write-Host "Starting server on port 5001..." -ForegroundColor Green
npm start
