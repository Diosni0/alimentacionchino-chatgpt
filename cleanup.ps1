# Script de limpieza para eliminar archivos duplicados e innecesarios

Write-Host "🧹 Iniciando limpieza de archivos duplicados..." -ForegroundColor Green
Write-Host ""

# Archivos a eliminar
$filesToDelete = @(
    # Bots duplicados (mantener solo bot.js)
    "twitch_bot.js",
    "twitch_bot_v2.js", 
    "twitch_bot_optimized.js",
    "twitch_bot_ultra_optimized.js",
    
    # Índices duplicados (mantener solo server.js)
    "index.js",
    "index_optimized.js",
    "index_ultra_optimized.js",
    
    # Archivos de funcionalidad duplicada
    "openai_operations.js",
    "performance_monitor.js",
    
    # Archivos temporales
    "file_context_simple.txt",
    
    # Documentación excesiva
    "PROFESSIONAL_ARCHITECTURE.md",
    "PERFORMANCE_COMPARISON.md",
    "MIGRATION_GUIDE.md",
    
    # Configuraciones duplicadas
    "package-professional.json",
    
    # Scripts duplicados
    "deploy.sh"
)

# Carpetas a eliminar
$foldersToDelete = @(
    "src"  # Carpeta de arquitectura profesional no necesaria
)

Write-Host "📁 Eliminando archivos duplicados:" -ForegroundColor Yellow

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "   ✅ Eliminado: $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No encontrado: $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📂 Eliminando carpetas innecesarias:" -ForegroundColor Yellow

foreach ($folder in $foldersToDelete) {
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
        Write-Host "   ✅ Eliminada carpeta: $folder" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No encontrada: $folder" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🎯 Archivos principales que quedan:" -ForegroundColor Cyan
Write-Host "   • bot.js (Bot principal limpio y elegante)" -ForegroundColor White
Write-Host "   • server.js (Servidor Express simplificado)" -ForegroundColor White
Write-Host "   • config.js (Configuración centralizada)" -ForegroundColor White
Write-Host "   • keep_alive.js (Keep alive para Render)" -ForegroundColor White
Write-Host "   • package.json (Dependencias limpias)" -ForegroundColor White
Write-Host "   • render.yaml (Configuración de deploy)" -ForegroundColor White

Write-Host ""
Write-Host "✨ Limpieza completada! El código ahora es:" -ForegroundColor Green
Write-Host "   ✅ Simple y elegante" -ForegroundColor White
Write-Host "   ✅ Sin duplicados" -ForegroundColor White
Write-Host "   ✅ Fácil de mantener" -ForegroundColor White
Write-Host "   ✅ Compacto pero potente" -ForegroundColor White

Write-Host ""
Write-Host "🚀 Para desplegar la versión limpia:" -ForegroundColor Cyan
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m 'Clean and elegant bot - removed duplicates'" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor White