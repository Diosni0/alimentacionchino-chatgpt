# 🤖 Bot de Twitch con IA - Versión Limpia y Elegante

**Bot de Twitch inteligente con integración de OpenAI, optimizado para rendimiento y simplicidad.**

## 🌟 Características Principales

- **🧠 IA Avanzada**: Integración completa con OpenAI (GPT-4, GPT-3.5, modelos razonadores)
- **⚡ Ultra Optimizado**: Cache inteligente, rate limiting adaptativo, gestión eficiente de memoria
- **🎭 Personalidad Completa**: Sistema de contexto avanzado para mantener personalidad consistente
- **👥 Control de Acceso**: Restricción por suscriptores, bypass para moderadores
- **📊 Monitoreo**: Métricas en tiempo real, health checks, logging estructurado
- **🔧 Fácil Configuración**: Setup simple con variables de entorno
- **🚀 Deploy Automático**: Listo para Render.com con configuración incluida

## 🏗️ Arquitectura Limpia

Esta versión ha sido completamente reestructurada para ser:
- ✅ **Simple**: Solo 6 archivos principales, sin duplicados
- ✅ **Elegante**: Código limpio y bien organizado
- ✅ **Potente**: Mantiene todas las optimizaciones avanzadas
- ✅ **Mantenible**: Fácil de entender y modificar

## 📋 Archivos Principales

- **`bot.js`** - Bot principal con toda la lógica optimizada
- **`server.js`** - Servidor Express con API REST
- **`config.js`** - Configuración centralizada y validada
- **`file_context.txt`** - Contexto y personalidad del bot
- **`package.json`** - Dependencias y scripts
- **`render.yaml`** - Configuración de despliegue

---

## 🚀 Instalación y Configuración

### 1. Hacer Fork del Repositorio

Inicia sesión en GitHub y haz fork de este repositorio para obtener tu propia copia.

### 2. Configurar el Contexto del Bot

Abre `file_context.txt` y personaliza toda la información de fondo para tu bot. Este contenido se incluirá en cada solicitud a la IA.

### 3. Crear Cuenta en OpenAI

Crea una cuenta en [OpenAI](https://platform.openai.com) y configura límites de facturación si es necesario.

### 4. Obtener API Key de OpenAI

Genera una clave API en la [página de claves API](https://platform.openai.com/account/api-keys) y guárdala de forma segura.

### 5. Desplegar en Render

Render te permite ejecutar tu bot 24/7 de forma gratuita. Sigue estos pasos:

#### 5.1. Desplegar en Render

Haz clic en el botón para desplegar:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### 5.2. Iniciar Sesión con GitHub

Inicia sesión con tu cuenta de GitHub y selecciona tu repositorio forkeado para el despliegue.

### 6. Configurar Variables de Entorno

Ve a la pestaña de variables/environment en tu despliegue de Render y configura las siguientes variables:

#### 6.1. Variables Obligatorias

- `OPENAI_API_KEY`: Tu clave API de OpenAI

#### 6.2. Variables de Integración con Twitch

- `TWITCH_USER`: Nombre de usuario del bot (ej: `MIAKhalifaV2Bot`)
- `TWITCH_AUTH`: Token OAuth para tu bot de Twitch
  - Ve a https://twitchapps.com/tmi/ y haz clic en "Connect with Twitch"
  - Copia el token de la página y pégalo en la variable TWITCH_AUTH
  - ⚠️ **ESTE TOKEN PUEDE EXPIRAR DESPUÉS DE UNOS DÍAS** ⚠️

**Para funciones de suscriptores, también necesitas:**
- `TWITCH_CLIENT_ID`: ID de cliente de tu aplicación de Twitch
- `TWITCH_CLIENT_SECRET`: Secreto de cliente de tu aplicación de Twitch
  - Crea una nueva aplicación en https://dev.twitch.tv/console
  - Obtén tu Client ID y Client Secret

#### 6.3. Variables de Configuración del Bot

- `CHANNELS`: Lista de canales de Twitch donde funcionará el bot (separados por comas)
- `COMMAND_NAME`: (por defecto: `!gpt`) Comando que activa el bot. Puedes configurar múltiples comandos separándolos con comas (ej: `!gpt,!ia,!mia`)
- `SEND_USERNAME`: (por defecto: `true`) Si incluir el nombre de usuario en el mensaje enviado a OpenAI
- `ENABLE_TTS`: (por defecto: `false`) Si habilitar Text-to-Speech
- `COOLDOWN_DURATION`: (por defecto: `10`) Duración del cooldown en segundos entre respuestas

#### 6.4. Control de Acceso por Suscriptores

- `SUBSCRIBERS_ONLY`: (por defecto: `false`) Si restringir el uso del bot solo a suscriptores
- `MODERATORS_BYPASS`: (por defecto: `true`) Si los moderadores pueden saltarse las restricciones de suscriptor

#### 6.5. Configuración Avanzada de OpenAI

- `MODEL_NAME`: (por defecto: `gpt-5`) Modelo de OpenAI a usar. Modelos disponibles [aquí](https://platform.openai.com/docs/models/)
- `FIRST_CHAT_MODEL`: (por defecto: `gpt-5-chat-latest`) Modelo para la primera respuesta a cada usuario
- `TEMPERATURE`: (por defecto: `1.0`) Controla la aleatoriedad en las respuestas (0.0 = determinista, 2.0 = muy aleatorio)
- `MAX_TOKENS`: (por defecto: `200`) Número máximo de tokens en la respuesta (alias: `MAX_COMPLETION_TOKENS`)
- `TOP_P`: (por defecto: `1.0`) Controla la diversidad mediante nucleus sampling (0.0 a 1.0)
- `FREQUENCY_PENALTY`: (por defecto: `0.5`) Reduce la repetición de la misma información
- `PRESENCE_PENALTY`: (por defecto: `0.0`) Reduce la repetición de los mismos temas
- `HISTORY_LENGTH`: (por defecto: `5`) Número de mensajes anteriores a incluir en el contexto

---

## 💬 Uso del Bot

### Comandos

Puedes interactuar con el bot usando comandos en el chat de Twitch. Por defecto, el comando es `!gpt`. Puedes cambiarlo en las variables de entorno.

### Ejemplo

Para usar el comando `!gpt`:

```twitch
!gpt ¿Cómo está el clima hoy?
```

El bot responderá con un mensaje generado por OpenAI.

### Control de Suscriptores

Si `SUBSCRIBERS_ONLY` está habilitado:
- Solo los suscriptores del canal pueden usar el bot
- Los moderadores pueden saltarse esta restricción si `MODERATORS_BYPASS` está habilitado
- Los no suscriptores recibirán un mensaje explicando la restricción

### Endpoints de API

El bot proporciona varios endpoints de API:

- `GET /gpt/:text` - Generar una respuesta (para integraciones externas)
- `GET /metrics` - Obtener métricas del bot
- `GET /health` - Verificar estado de salud del bot
- `POST /clear-cache` - Limpiar cache del bot

### Integración con Streamelements y Nightbot

#### Streamelements

Crea un comando personalizado con la respuesta:

```twitch
$(urlfetch https://tu-url-render.onrender.com/gpt/"${user}:${queryescape ${1:}}")
```

#### Nightbot

Crea un comando personalizado con la respuesta:

```twitch
!addcom !gptcmd $(urlfetch https://tu-url-render.onrender.com/gpt/$(user):$(querystring))
```

Reemplaza `tu-url-render.onrender.com` con tu URL real de Render.
Reemplaza `gptcmd` con el nombre de comando que desees.
Elimina `$(user):` si no quieres incluir el nombre de usuario en el mensaje enviado a OpenAI.

---

## 🎛️ Ajuste Fino de Parámetros de OpenAI

Puedes ajustar finamente las respuestas de la IA usando estos parámetros:

### Temperature (0.0 - 2.0)
- **0.0**: Respuestas muy enfocadas y deterministas
- **0.7**: Balance entre creatividad y enfoque
- **1.0**: Por defecto, buen balance
- **1.5+**: Respuestas más creativas y variadas

### Max Tokens (1 - 4096)
- **50-100**: Respuestas cortas y concisas
- **150-300**: Respuestas de longitud media (por defecto)
- **500+**: Respuestas más largas y detalladas

### Top P (0.0 - 1.0)
- **0.1**: Muy enfocado en tokens más probables
- **0.9**: Buen balance de enfoque y diversidad
- **1.0**: Máxima diversidad

### Frequency Penalty (-2.0 - 2.0)
- **0.0**: Sin penalización por repetición
- **0.5**: Penalización moderada (por defecto)
- **1.0+**: Fuerte penalización contra repetición

### Presence Penalty (-2.0 - 2.0)
- **0.0**: Sin penalización por repetición de temas (por defecto)
- **0.5**: Penalización moderada por repetir temas
- **1.0+**: Fuerte penalización por repetición de temas

---

## 📊 Monitoreo y Métricas

### Métricas en Tiempo Real

Visita `https://tu-bot.onrender.com/metrics` para ver:

```json
{
  "bot": {
    "processed": 1250,
    "errors": 3,
    "cacheHitRate": "85.2%",
    "cacheSize": 45,
    "subscribers": 15,
    "moderators": 3
  },
  "server": {
    "uptime": 3600,
    "memory": "28MB"
  }
}
```

### Health Check

Visita `https://tu-bot.onrender.com/health` para verificar el estado del bot.

---

## 🚀 Scripts Disponibles

```bash
# Iniciar el bot
npm start

# Desarrollo con debugging
npm run dev

# Ejecutar tests
npm test

# Desplegar cambios
.\deploy.ps1
```

---

## 🔧 Solución de Problemas

### Bot no responde
1. Verifica que `OPENAI_API_KEY` esté configurada correctamente
2. Revisa que `TWITCH_AUTH` no haya expirado
3. Confirma que el canal esté en la lista `CHANNELS`

### Errores de autenticación
1. Regenera el token OAuth en https://twitchapps.com/tmi/
2. Actualiza la variable `TWITCH_AUTH` en Render
3. Redespliega el servicio

### Respuestas lentas
1. Verifica las métricas en `/metrics`
2. Considera reducir `MAX_TOKENS`
3. Aumenta `COOLDOWN_DURATION` si es necesario

---

## 📈 Optimizaciones Incluidas

- **Cache Inteligente**: 85% de cache hit rate esperado
- **Rate Limiting**: Protección contra spam y límites de API
- **Gestión de Memoria**: Limpieza automática de datos antiguos
- **Manejo de Errores**: Recuperación automática de fallos
- **Métricas**: Monitoreo en tiempo real del rendimiento

---

## 🎯 Próximas Actualizaciones

- [ ] Integración con más plataformas de streaming
- [ ] Dashboard web para administración
- [ ] Comandos personalizados avanzados
- [ ] Integración con bases de datos
- [ ] Sistema de plugins

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Haz fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

**¡Gracias por usar el Bot de Twitch con IA! 🤖✨**