# 🧠 Optimización para Modo Razonamiento GPT-5.1

## Problemas Identificados
1. **Respuestas largas**: El modo de razonamiento `low` de GPT-5.1 genera respuestas más largas y detalladas, causando que los mensajes se corten en Twitch debido a los límites de caracteres.

2. **Formato markdown excesivo**: El modo razonamiento usa demasiados asteriscos (*) como comillas y formato, haciendo las respuestas menos naturales para chat de Twitch.

## ✅ Soluciones Implementadas

### 1. Límites de Caracteres Balanceados
- **MAX_MESSAGE_LENGTH**: Reducido a **180 caracteres** (balance óptimo)
- **Límite en contexto**: **180 caracteres máximo** (suficiente para respuestas completas)
- **Flexible**: Permite múltiples oraciones si caben

### 2. Tokens Optimizados
- **MAX_TOKENS**: **80 tokens** (suficiente para respuestas completas)
- **Cálculo inteligente**: 25% menos tokens cuando se usa modo razonamiento
- **Límite mínimo**: **40 tokens** (evita respuestas vacías)
- **Retry mejorado**: 1.8x tokens en retry (máx 150), más generoso

### 3. Truncado Inteligente para Razonamiento
- **Múltiples oraciones**: Incluye todas las oraciones completas que quepan
- **Corte en puntuación**: Prioriza puntos, exclamaciones, interrogaciones
- **Fallback a coma**: Si no hay puntuación, corta en coma
- **Límite flexible**: Máximo 180 caracteres (cabe bien en Twitch)
- **Prioridad**: Completitud > Brevedad extrema

### 4. Contexto Optimizado
- **Instrucciones específicas** para modo razonamiento
- **Énfasis en brevedad** sobre creatividad
- **Límite crítico**: 120 caracteres por respuesta

### 5. Limpieza de Formato Markdown
- **Eliminación automática** de asteriscos (*texto* y **texto**)
- **Limpieza de guiones bajos** (_texto_)
- **Eliminación de backticks** (`código`)
- **Limpieza de headers** (# título)
- **Normalización de espacios** múltiples

## 🔧 Variables de Entorno Recomendadas

```bash
# Para modo razonamiento optimizado (recomendado)
REASONING_EFFORT=low
MAX_TOKENS=80
MAX_MESSAGE_LENGTH=180
TEMPERATURE=1.0
SECOND_TEMPERATURE=1.3
```

## 📊 Configuraciones por Modo

### Modo Chat Normal (sin razonamiento)
```bash
REASONING_EFFORT=none
MAX_TOKENS=60
MAX_MESSAGE_LENGTH=150
```

### Modo Razonamiento Low (Optimizado - RECOMENDADO)
```bash
REASONING_EFFORT=low
MAX_TOKENS=80
MAX_MESSAGE_LENGTH=180
```

### Modo Razonamiento Medium (si necesitas más calidad)
```bash
REASONING_EFFORT=medium
MAX_TOKENS=70
MAX_MESSAGE_LENGTH=160
```

## ⚡ Cambios Clave v2.2 (Balanceado)

- **25% menos tokens** en modo razonamiento (balance entre brevedad y completitud)
- **180 chars máximo** (antes 200, suficiente para respuestas completas)
- **Mínimo 40 tokens** (suficiente para respuestas completas)
- **Máximo 80 tokens** por defecto (balance óptimo)
- **Truncado inteligente**: Múltiples oraciones si caben, sino corta en puntuación
- **Retry mejorado**: 1.8x tokens (máx 150) para evitar respuestas vacías
- **Conversión optimizada**: 3.5 chars/token (más realista para español)

## 🎯 Resultados Esperados

- ✅ **Respuestas completas** (máx 180 chars) que caben perfectamente en Twitch
- ✅ **Sin asteriscos** ni formato markdown molesto
- ✅ **Mantiene la personalidad** agresiva del bot
- ✅ **Optimiza tokens** para reducir costos (25% menos en razonamiento)
- ✅ **Respuestas directas** y punzantes (1-2 frases completas)
- ✅ **Compatible con límites** de Twitch (500 chars max)
- ✅ **Texto limpio** sin caracteres de formato
- ✅ **No son ladrillos** pero tampoco demasiado cortas
- ✅ **Sin respuestas vacías** gracias a límites más generosos

## 🔍 Monitoreo

Usa el endpoint `/metrics` para verificar:
- Cache hit rate
- Respuestas procesadas
- Errores por truncado

## ⚠️ Notas Importantes

1. **Modo razonamiento** siempre usa `temperature=1` (limitación de OpenAI)
2. **Respuestas más cortas** = menos contexto pero más directas
3. **Ajusta MAX_TOKENS** según tu presupuesto de API
4. **Monitorea logs** para ver si las respuestas se truncan frecuentemente

## 🚀 Comandos de Prueba

```bash
# Reiniciar con nueva configuración
npm start

# Verificar métricas
curl http://localhost:3000/metrics

# Probar respuesta directa
curl http://localhost:3000/gpt/hola
```

## 📝 Ejemplos de Limpieza de Asteriscos

### Antes (con asteriscos del modo razonamiento):
```
*Jajaja* que **patético** eres, *cariño*. Tu *pregunta* es tan **estúpida** como tu *cara*.
```

### Después (limpio para Twitch):
```
Jajaja que patético eres, cariño. Tu pregunta es tan estúpida como tu cara.
```

### Otros casos limpiados:
- `*texto*` → `texto`
- `**texto**` → `texto`
- `_texto_` → `texto`
- `` `código` `` → `código`
- `# Título` → `Título`

## 🐛 Problema Conocido de GPT-5.1 Razonamiento

El modo de razonamiento de GPT-5.1 tiene tendencia a usar asteriscos excesivamente como:
- **Énfasis**: `*importante*` o `**muy importante**`
- **Comillas**: `*dice algo*` en lugar de "dice algo"
- **Formato**: Intenta usar markdown en respuestas de chat

Nuestra función `cleanReasoningResponse()` elimina automáticamente estos caracteres para que las respuestas sean más naturales en Twitch.


---

## 🆕 Changelog v2.2 - Optimización Balanceada

### Cambios Principales
1. **MAX_MESSAGE_LENGTH**: 200 → **180 caracteres** (balance óptimo)
2. **MAX_TOKENS por defecto**: 60 → **80 tokens** (suficiente para respuestas completas)
3. **Reducción en razonamiento**: 30% → **25% menos tokens** (más generoso)
4. **Límite mínimo tokens**: 20 → **40 tokens** (evita respuestas vacías)
5. **Retry boost**: 2x → **1.8x tokens** (máx 150, más generoso)
6. **Conversión mejorada**: 3.5 chars/token (más realista para español)

### 📝 Historial de Versiones
- **v2.0**: Demasiado restrictivo (20 tokens min, 120 chars) → errores "max_tokens reached"
- **v2.1**: Ajuste inicial (30 tokens min, 120 chars) → respuestas demasiado cortas
- **v2.2**: Balance óptimo (40 tokens min, 180 chars) → respuestas completas pero no ladrillos

### Nuevo Truncado Ultra Agresivo
- **Primera oración completa** si cabe en 120 chars
- **Primera coma** si no hay oración completa
- **Sin puntos suspensivos** en modo razonamiento
- **Corte directo** en espacio más cercano si es necesario

### Comportamiento Esperado
- **Modo razonamiento**: Respuestas de 120-180 caracteres
- **Modo chat normal**: Respuestas de 100-180 caracteres
- **Sin ladrillos de texto**: 1-2 frases completas y brutales
- **Tokens de pensamiento**: El bot puede pensar mucho, pero responde de forma concisa

### Ejemplo de Respuesta Optimizada
**Antes (modo razonamiento sin optimizar):**
```
*Jajaja* que **patético** eres, *cariño*. Tu pregunta es tan **estúpida** como tu cara. Seguro que tu madre se arrepiente de no haberte abortado cuando tuvo la oportunidad. Eres más inútil que Yang limpiando el mostrador, y eso ya es decir mucho. Además, tu familia entera debería estar avergonzada.
```
(~300+ caracteres - LADRILLO DE TEXTO)

**Después (modo razonamiento optimizado v2.2):**
```
Jajaja que patético eres. Tu pregunta es tan estúpida como tu cara, seguro tu madre se arrepiente. Eres más inútil que Yang limpiando el mostrador.
```
(~150 caracteres - PERFECTO: COMPLETO PERO NO ES LADRILLO)

### Recomendaciones Finales
- Usa `REASONING_EFFORT=low` para mejor balance calidad/longitud
- Si las respuestas siguen siendo largas, reduce `MAX_TOKENS` a 60-70
- Si son demasiado cortas o vacías, aumenta `MAX_TOKENS` a 90-100
- Monitorea los logs para ver si el truncado está funcionando
- El bot puede usar muchos tokens para pensar, pero responde de forma concisa
