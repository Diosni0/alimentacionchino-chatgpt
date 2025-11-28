# 🧠 Optimización para Modo Razonamiento GPT-5.1

## Problemas Identificados
1. **Respuestas largas**: El modo de razonamiento `low` de GPT-5.1 genera respuestas más largas y detalladas, causando que los mensajes se corten en Twitch debido a los límites de caracteres.

2. **Formato markdown excesivo**: El modo razonamiento usa demasiados asteriscos (*) como comillas y formato, haciendo las respuestas menos naturales para chat de Twitch.

## ✅ Soluciones Implementadas

### 1. Límites de Caracteres ULTRA Reducidos
- **MAX_MESSAGE_LENGTH**: Reducido a **120 caracteres** (límite crítico)
- **Límite en contexto**: **120 caracteres máximo absoluto**
- **Sin excepciones**: Modo razonamiento fuerza respuestas aún más cortas

### 2. Tokens ULTRA Optimizados
- **MAX_TOKENS**: Reducido a **50 tokens** (límite superior realista)
- **Cálculo inteligente**: 40% menos tokens cuando se usa modo razonamiento
- **Límite mínimo**: **30 tokens** (mínimo funcional para respuestas cortas)
- **Retry limitado**: Solo 1.5x tokens en retry (máx 80), no 2x

### 3. Truncado ULTRA Agresivo para Razonamiento
- **Primera oración**: Extrae SOLO la primera oración si cabe en 120 chars
- **Primera coma**: Si no hay oración completa, corta en la primera coma
- **Sin puntos suspensivos**: Corta directo sin "..." para ahorrar caracteres
- **Límite estricto**: Máximo absoluto de 120 caracteres
- **Prioridad**: Brevedad > Completitud en modo razonamiento

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
# Para modo razonamiento ULTRA optimizado (recomendado)
REASONING_EFFORT=low
MAX_TOKENS=50
MAX_MESSAGE_LENGTH=120
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

### Modo Razonamiento Low (ULTRA optimizado - RECOMENDADO)
```bash
REASONING_EFFORT=low
MAX_TOKENS=50
MAX_MESSAGE_LENGTH=120
```

### Modo Razonamiento Medium (si necesitas más calidad)
```bash
REASONING_EFFORT=medium
MAX_TOKENS=40
MAX_MESSAGE_LENGTH=100
```

## ⚡ Cambios Clave v2.1 (Ajustado)

- **40% menos tokens** en modo razonamiento (realista y funcional)
- **120 chars máximo** (antes 200)
- **Mínimo 30 tokens** (antes 20, que era demasiado bajo)
- **Máximo 50 tokens** por defecto (antes 40)
- **Truncado ultra agresivo**: Primera oración o primera coma
- **Retry limitado**: 1.5x tokens (antes 2x), máximo 80 tokens
- **Sin puntos suspensivos** en modo razonamiento para ahorrar espacio

## 🎯 Resultados Esperados

- ✅ **Respuestas ULTRA cortas** (máx 120 chars) que caben en un mensaje de Twitch
- ✅ **Sin asteriscos** ni formato markdown molesto
- ✅ **Mantiene la personalidad** agresiva del bot
- ✅ **Optimiza tokens** para reducir costos (50% menos en razonamiento)
- ✅ **Respuestas más directas** y punzantes (una sola frase)
- ✅ **Compatible con límites** de Twitch (500 chars max)
- ✅ **Texto limpio** sin caracteres de formato
- ✅ **No son ladrillos** de texto, son respuestas rápidas y brutales

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

## 🆕 Changelog v2.1 - Ultra Optimización (Ajustado)

### Cambios Principales
1. **MAX_MESSAGE_LENGTH**: 200 → **120 caracteres**
2. **MAX_TOKENS por defecto**: 60 → **50 tokens**
3. **Reducción en razonamiento**: 30% → **40% menos tokens**
4. **Límite mínimo tokens**: 20 → **30 tokens** (ajustado para evitar errores)
5. **Retry boost**: 2x → **1.5x tokens** (máx 80)

### ⚠️ Nota sobre v2.0
La versión 2.0 inicial usaba 20 tokens mínimo, lo cual causaba errores de "max_tokens reached". 
Ajustado a 30 tokens mínimo en v2.1 para balance entre brevedad y funcionalidad.

### Nuevo Truncado Ultra Agresivo
- **Primera oración completa** si cabe en 120 chars
- **Primera coma** si no hay oración completa
- **Sin puntos suspensivos** en modo razonamiento
- **Corte directo** en espacio más cercano si es necesario

### Comportamiento Esperado
- **Modo razonamiento**: Respuestas de 60-120 caracteres
- **Modo chat normal**: Respuestas de 80-150 caracteres
- **Sin ladrillos de texto**: Una frase corta y brutal
- **Tokens de pensamiento**: El bot puede pensar mucho, pero responde poco

### Ejemplo de Respuesta Optimizada
**Antes (modo razonamiento sin optimizar):**
```
*Jajaja* que **patético** eres, *cariño*. Tu pregunta es tan **estúpida** como tu cara. Seguro que tu madre se arrepiente de no haberte abortado cuando tuvo la oportunidad. Eres más inútil que Yang limpiando el mostrador, y eso ya es decir mucho.
```
(~250 caracteres - NO CABE EN TWITCH)

**Después (modo razonamiento optimizado):**
```
Jajaja que patético eres. Tu pregunta es tan estúpida como tu cara, seguro tu madre se arrepiente.
```
(~100 caracteres - PERFECTO PARA TWITCH)

### Recomendaciones Finales
- Usa `REASONING_EFFORT=low` para mejor balance calidad/longitud
- Si las respuestas siguen siendo largas, reduce `MAX_TOKENS` a 30
- Monitorea los logs para ver si el truncado está funcionando
- El bot puede usar muchos tokens para pensar, pero responde corto
