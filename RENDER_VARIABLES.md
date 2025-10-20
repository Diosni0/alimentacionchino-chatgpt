﻿# Variables de Entorno para Render - v2.0

Este archivo contiene todas las variables de entorno necesarias para desplegar el bot en Render.

## ­ƒöº Variables Requeridas

### OpenAI
```
OPENAI_API_KEY=tu_api_key_de_openai
```

### Twitch (B├ísico)
```
TWITCH_USER=nombre_de_tu_bot
TWITCH_AUTH=oauth:tu_token_de_twitch
CHANNELS=canal1,canal2,canal3
```

## ÔÜÖ´©Å Variables Opcionales

### Configuraci├│n del Bot
```
GPT_MODE=CHAT
COMMAND_NAME=!gpt
SEND_USERNAME=true
ENABLE_TTS=false
ENABLE_CHANNEL_POINTS=false
COOLDOWN_DURATION=10
MAX_MESSAGE_LENGTH=399
```

### Control de Suscripciones
```
SUBSCRIBERS_ONLY=false
MODERATORS_BYPASS=true
```

### Configuraci├│n de OpenAI (Nuevas en v2.0)
```
MODEL_NAME=gpt-5
TEMPERATURE=1.0
# Puedes usar cualquiera de estas dos (son equivalentes en el c├│digo):
MAX_TOKENS=200
# o
MAX_COMPLETION_TOKENS=200
TOP_P=1.0
FREQUENCY_PENALTY=0.5
PRESENCE_PENALTY=0.0
HISTORY_LENGTH=5
```

### Servidor
```
PORT=3000
```

## ­ƒôï Configuraci├│n Completa para Render

Copia y pega estas variables en la secci├│n "Environment Variables" de tu proyecto en Render:

### Variables B├ísicas (Requeridas)
```
OPENAI_API_KEY=tu_api_key_de_openai
TWITCH_USER=nombre_de_tu_bot
TWITCH_AUTH=oauth:tu_token_de_twitch
CHANNELS=tu_canal
```

### Variables Avanzadas (Opcionales)
```
GPT_MODE=CHAT
COMMAND_NAME=!gpt
SEND_USERNAME=true
ENABLE_TTS=false
ENABLE_CHANNEL_POINTS=false
COOLDOWN_DURATION=10
MAX_MESSAGE_LENGTH=399
SUBSCRIBERS_ONLY=false
MODERATORS_BYPASS=true
MODEL_NAME=gpt-5
TEMPERATURE=1.0
# Usa MAX_TOKENS o MAX_COMPLETION_TOKENS
MAX_TOKENS=200
TOP_P=1.0
FREQUENCY_PENALTY=0.5
PRESENCE_PENALTY=0.0
HISTORY_LENGTH=5
PORT=3000
```

## ­ƒÄ» C├│mo Configurar en Render

1. Ve a tu proyecto en Render
2. Haz clic en "Environment"
3. En la secci├│n "Environment Variables"
4. Agrega cada variable una por una
5. Haz clic en "Save Changes"
6. Reinicia el deploy

## ­ƒöä Actualizar Variables Existentes

Si ya tienes variables configuradas:

1. **Mant├®n las existentes** que ya funcionan
2. **Agrega las nuevas** variables de v2.0
3. **Actualiza los valores** si es necesario

### Variables que puedes actualizar:
- `MODEL_NAME`: Cambia de `gpt-3.5-turbo` o `gpt-4o-mini` a `gpt-5`
- `MAX_TOKENS`/`MAX_COMPLETION_TOKENS`: Ajusta a `200` para reducir vac├¡os por `length`

### Variables nuevas que puedes agregar:
- `TEMPERATURE=1.0`
- `TOP_P=1.0`
- `FREQUENCY_PENALTY=0.5`
- `PRESENCE_PENALTY=0.0`
- `SUBSCRIBERS_ONLY=false`
- `MODERATORS_BYPASS=true`

## ­ƒÜ¿ Soluci├│n si no aparecen las nuevas variables

Si Render no muestra las nuevas variables:

1. **Forzar redeploy**: Ve a "Manual Deploy" ÔåÆ "Deploy latest commit"
2. **Verificar repositorio**: Aseg├║rate de que est├® conectado al repositorio correcto
3. **Limpiar cache**: A veces Render cachea la configuraci├│n

## ­ƒô× Soporte

Si tienes problemas:
1. Verifica que el repositorio est├® actualizado en GitHub
2. Fuerza un redeploy manual en Render
3. Revisa los logs de Render para errores 
