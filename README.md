# ChatGPT Twitch Bot Documentation v2.0

**Important Notice: This bot now uses TwitchIO for better subscription management and has been updated with the latest OpenAI API features.**

Your support means the world to me! ❤️

☕ [Buy me a coffee to support me](https://www.buymeacoffee.com/osetinhas) ☕

Join our Discord community:

[https://discord.gg/pcxybrpDx6](https://discord.gg/pcxybrpDx6)

---

## Overview

This is a Node.js chatbot with ChatGPT integration, designed to work with Twitch streams. It uses the Express framework, TwitchIO for Twitch integration, and can operate in two modes: chat mode (with context of previous messages) or prompt mode (without context of previous messages).

## New Features in v2.0

- **Subscription-only access**: Restrict bot usage to channel subscribers only
- **Enhanced OpenAI integration**: Support for all latest OpenAI API parameters
- **TwitchIO integration**: Better Twitch API integration with subscription detection
- **New environment variables**: Fine-tune AI responses with temperature, max tokens, etc.
- **API endpoints**: New endpoints for subscriber verification and bot statistics
- **Improved error handling**: Better error handling and graceful shutdown
- **Configuration validation**: Automatic validation of required environment variables

## Features

- Responds to Twitch chat commands with ChatGPT-generated responses
- Can operate in chat mode with context or prompt mode without context
- Supports Text-to-Speech (TTS) for responses
- **NEW**: Subscription-only access control
- **NEW**: Moderator bypass option for subscription restrictions
- **NEW**: Configurable AI parameters (temperature, max tokens, etc.)
- **NEW**: API endpoints for external integrations
- Customizable via environment variables
- Deployed on Render for 24/7 availability

---

## Setup Instructions

### 1. Fork the Repository

Login to GitHub and fork this repository to get your own copy.

### 2. Fill Out Your Context File

Open `file_context.txt` and write down all your background information for GPT. This content will be included in every request.

### 3. Create an OpenAI Account

Create an account on [OpenAI](https://platform.openai.com) and set up billing limits if necessary.

### 4. Get Your OpenAI API Key

Generate an API key on the [API keys page](https://platform.openai.com/account/api-keys) and store it securely.

### 5. Deploy on Render

Render allows you to run your bot 24/7 for free. Follow these steps:

#### 5.1. Deploy to Render

Click the button below to deploy:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

#### 5.2. Login with GitHub

Log in with your GitHub account and select your forked repository for deployment.

### 6. Set Environment Variables

Go to the variables/environment tab in your Render deployment and set the following variables:

#### 6.1. Required Variables

- `OPENAI_API_KEY`: Your OpenAI API key.

#### 6.2. Twitch Integration Variables

- `TWITCH_AUTH`: OAuth token for your Twitch bot.
  - Go to https://twitchapps.com/tmi/ and click on Connect with Twitch
  - Copy the token from the page and paste it in the TWITCH_AUTH variable  
  - ⚠️ THIS TOKEN MIGHT EXPIRE AFTER A FEW DAYS, SO YOU MIGHT HAVE TO REPEAT THIS STEP EVERY FEW DAYS ⚠️

**NEW**: For subscription features, you also need:
- `TWITCH_CLIENT_ID`: Your Twitch application client ID
- `TWITCH_CLIENT_SECRET`: Your Twitch application client secret
  - Create a new application at https://dev.twitch.tv/console
  - Get your Client ID and Client Secret

#### 6.3. Bot Configuration Variables

- `GPT_MODE`: (default: `CHAT`) Mode of operation, can be `CHAT` or `PROMPT`.
- `COMMAND_NAME`: (default: `!gpt`) The command that triggers the bot. You can set more than one command by separating them with a comma (e.g. `!gpt,!chatbot`).
- `CHANNELS`: List of Twitch channels the bot will join (comma-separated). (e.g. `channel1,channel2`; do not include www.twitch.tv)
- `SEND_USERNAME`: (default: `true`) Whether to include the username in the message sent to OpenAI.
- `ENABLE_TTS`: (default: `false`) Whether to enable Text-to-Speech.
- `ENABLE_CHANNEL_POINTS`: (default: `false`) Whether to enable channel points integration.
- `COOLDOWN_DURATION`: (default: `10`) Cooldown duration in seconds between responses.
- `MAX_MESSAGE_LENGTH`: (default: `399`) Maximum length for bot responses.

#### 6.4. NEW: Subscription Control Variables

- `SUBSCRIBERS_ONLY`: (default: `false`) Whether to restrict bot usage to subscribers only.
- `MODERATORS_BYPASS`: (default: `true`) Whether moderators can bypass subscription restrictions.

#### 6.5. NEW: OpenAI Configuration Variables

- `MODEL_NAME`: (default: `gpt-4o-mini`) The OpenAI model to use. You can check the available models [here](https://platform.openai.com/docs/models/).
- `TEMPERATURE`: (default: `1.0`) Controls randomness in responses (0.0 = deterministic, 2.0 = very random).
- `MAX_TOKENS`: (default: `150`) Maximum number of tokens in the response.
- `TOP_P`: (default: `1.0`) Controls diversity via nucleus sampling (0.0 to 1.0).
- `FREQUENCY_PENALTY`: (default: `0.5`) Reduces repetition of the same information.
- `PRESENCE_PENALTY`: (default: `0.0`) Reduces repetition of the same topics.
- `HISTORY_LENGTH`: (default: `5`) Number of previous messages to include in context.

---

## Usage

### Commands

You can interact with the bot using Twitch chat commands. By default, the command is `!gpt`. You can change this in the environment variables.

### Example

To use the `!gpt` command:

```twitch
!gpt What is the weather today?
```

The bot will respond with an OpenAI-generated message.

### NEW: Subscription Control

If `SUBSCRIBERS_ONLY` is enabled:
- Only channel subscribers can use the bot
- Moderators can bypass this restriction if `MODERATORS_BYPASS` is enabled
- Non-subscribers will receive a message explaining the restriction

### NEW: API Endpoints

The bot now provides several API endpoints:

- `GET /gpt/:text` - Generate a response (for external integrations)
- `GET /subscriber/:username` - Check if a user is a subscriber
- `GET /stats` - Get bot statistics
- `POST /reset-history` - Reset conversation history

### Streamelements and Nightbot Integration

#### Streamelements

Create a custom command with the response:

```twitch
$(urlfetch https://your-render-url.onrender.com/gpt/"${user}:${queryescape ${1:}}")
```

#### Nightbot

Create a custom command with the response:

```twitch
!addcom !gptcmd $(urlfetch https://twitch-chatgpt-bot.onrender.com/gpt/$(user):$(querystring))
```

Replace `your-render-url.onrender.com` with your actual Render URL.
Replace `gptcmd` with your desired command name.
Remove `$(user):` if you don't want to include the username in the message sent to OpenAI.

---

## NEW: OpenAI Parameter Tuning

You can now fine-tune the AI responses using these parameters:

### Temperature (0.0 - 2.0)
- **0.0**: Very focused, deterministic responses
- **0.7**: Balanced creativity and focus
- **1.0**: Default, good balance
- **1.5+**: More creative and varied responses

### Max Tokens (1 - 4096)
- **50-100**: Short, concise responses
- **150-300**: Medium-length responses (default)
- **500+**: Longer, more detailed responses

### Top P (0.0 - 1.0)
- **0.1**: Very focused on most likely tokens
- **0.9**: Good balance of focus and diversity
- **1.0**: Maximum diversity

### Frequency Penalty (-2.0 - 2.0)
- **0.0**: No penalty for repetition
- **0.5**: Moderate penalty (default)
- **1.0+**: Strong penalty against repetition

### Presence Penalty (-2.0 - 2.0)
- **0.0**: No penalty for topic repetition (default)
- **0.5**: Moderate penalty for repeating topics
- **1.0+**: Strong penalty for topic repetition

---

## Support

For any issues or questions, please join our [Discord community](https://discord.gg/pcxybrpDx6).

Thank you for using the ChatGPT Twitch Bot! Your support is greatly appreciated. ☕ [Buy me a coffee](https://www.buymeacoffee.com/osetinhas) ☕

---

## Migration from v1.x

If you're upgrading from v1.x:

1. **New required variables**: You may need to add `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` if using subscription features
2. **Updated dependencies**: The bot now uses TwitchIO instead of tmi.js
3. **New features**: Take advantage of the new OpenAI parameters and subscription controls
4. **API changes**: New endpoints are available for external integrations

---

### Important Notice

**This version uses TwitchIO for better Twitch integration and includes subscription management features.**