# Script de deployment para Windows PowerShell

Write-Host "Iniciando deployment del bot optimizado..." -ForegroundColor Green
Write-Host ""

# Verificar que estamos en un repositorio git
if (-not (Test-Path ".git")) {
    Write-Host "Error: No estas en un repositorio git" -ForegroundColor Red
    Write-Host "Ejecuta primero: git init" -ForegroundColor Yellow
    exit 1
}

# Mostrar estado actual
Write-Host "Estado actual del repositorio:" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "Agregando archivos..." -ForegroundColor Yellow
git add .

Write-Host ""
Write-Host "Creando commit..." -ForegroundColor Yellow
$commitMessage = "fix: Resolve security vulnerabilities and improve bot stability

- Removed deprecated 'request' package (fixed 3 critical/moderate vulnerabilities)
- Enhanced keep-alive system with bot connection monitoring
- Added automatic reconnection for Twitch bot every 2 minutes
- Improved health monitoring with detailed bot status endpoints
- Added connection state tracking and recovery mechanisms
- Fixed Render sleep mode issues with enhanced keep-alive jobs
- Zero vulnerabilities remaining after security audit"

git commit -m $commitMessage

Write-Host ""
Write-Host "Subiendo cambios a GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deployment completado exitosamente!" -ForegroundColor Green
    Write-Host "Revisa tu repositorio en GitHub" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Error al hacer push. Posibles causas:" -ForegroundColor Red
    Write-Host "   - No tienes configurado el remote origin" -ForegroundColor Yellow
    Write-Host "   - Problemas de autenticacion" -ForegroundColor Yellow
    Write-Host "   - Conflictos que resolver" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Comandos para solucionar:" -ForegroundColor Cyan
    Write-Host "   git remote -v  (verificar remote)" -ForegroundColor White
    Write-Host "   git pull origin main  (sincronizar)" -ForegroundColor White
}

Write-Host ""
Write-Host "Ultimos commits:" -ForegroundColor Cyan
git log --oneline -3