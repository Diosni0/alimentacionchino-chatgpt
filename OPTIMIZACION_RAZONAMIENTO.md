# 🧠 Optimización para Modo Razonamiento GPT-5.1

## Problemas Identificados
1. **Respuestas largas**: El modo de razonamiento `low` de GPT-5.1 genera respuestas más largas y detalladas, causando que los mensajes se corten en Twitch debido a los límites de caracteres.

2. **Formato markdown excesivo**: El modo razonamiento usa demasiados asteriscos (*) como comillas y formato, haciendo las respuestas menos naturales para chat de Twitch.

## ✅ Soluciones Implementadas

### 1. Límites de Caracteres Reducidos
- **MAX_MESSAGE_LENGTH**: Reducido de 450 a **200 caracteres**
- **Límite en contexto**: Reducido de 150 a **120 caracteres máximo**

### 2. Tokens Optimizados
- **MAX_TOKENS**: Reducido de 200 a **60 tokens**
- **Cálculo inteligente**: 30% menos tokens cuando se usa modo razonamiento
- **Límite mínimo**: Reducido a 30 tokens para forzar brevedad

### 3. Truncado Inteligente
- **Corte por puntuación**: Prioriza cortar en puntos, comas o exclamaciones
- **Primera oración**: Para respuestas muy largas, extrae solo la primera oración completa
- **Límite estricto**: Máximo absoluto de 200 caracteres

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
# Para modo razonamiento optimizado
REASONING_EFFORT=low
MAX_TOKENS=60
MAX_MESSAGE_LENGTH=200
TEMPERATURE=1.0
SECOND_TEMPERATURE=1.3
```

## 📊 Configuraciones por Modo

### Modo Chat Normal (sin razonamiento)
```bash
REASONING_EFFORT=none
MAX_TOKENS=80
MAX_MESSAGE_LENGTH=250
```

### Modo Razonamiento Low (optimizado)
```bash
REASONING_EFFORT=low
MAX_TOKENS=60
MAX_MESSAGE_LENGTH=200
```

### Modo Razonamiento Medium (si necesitas más calidad)
```bash
REASONING_EFFORT=medium
MAX_TOKENS=50
MAX_MESSAGE_LENGTH=180
```

## 🎯 Resultados Esperados

- ✅ **Respuestas completas** sin cortes en Twitch
- ✅ **Sin asteriscos** ni formato markdown molesto
- ✅ **Mantiene la personalidad** agresiva del bot
- ✅ **Optimiza tokens** para reducir costos
- ✅ **Respuestas más directas** y punzantes
- ✅ **Compatible con límites** de Twitch (500 chars max)
- ✅ **Texto limpio** sin caracteres de formato

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