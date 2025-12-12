# Variables de Entorno para Render

## Variables Requeridas

```
OPENAI_API_KEY=tu_api_key_de_openai
TWITCH_USER=nombre_de_tu_bot
TWITCH_AUTH=oauth:tu_token_de_twitch
CHANNELS=canal1,canal2
```

## Variables de Modelo OpenAI

```
MODEL_NAME=gpt-4o
TEMPERATURE=1.0
TOP_P=0.95
MAX_TOKENS=80
FREQUENCY_PENALTY=0.5
PRESENCE_PENALTY=0.0
HISTORY_LENGTH=5
# Solo para modelos o1: none, low, medium, high
REASONING_EFFORT=none
```

## Variables del Bot

```
GPT_MODE=CHAT
COMMAND_NAME=!gpt
SEND_USERNAME=true
ENABLE_TTS=false
COOLDOWN_DURATION=10
MAX_MESSAGE_LENGTH=180
SUBSCRIBERS_ONLY=false
MODERATORS_BYPASS=true
```

## Configuración en Render

1. Ve a tu proyecto en Render → Environment
2. Agrega las variables requeridas
3. Guarda y redeploy
