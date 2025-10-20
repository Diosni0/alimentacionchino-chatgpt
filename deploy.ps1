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
$commitMessage = "feat: Make bot more punzant and brutal with unlimited roasting permissions

- Reverted complex ingenio system to focus on direct brutal responses
- Added unlimited permission to roast family, appearance, personal life
- Simplified personality to be more aggressive and punzant
- Removed ingenio examples file for cleaner direct approach
- Enhanced vulgar and direct response capabilities
- Bot now has full permission to be brutally honest and offensive
- Focused on short, direct, and devastating responses"

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
