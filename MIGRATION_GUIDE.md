# Migration Guide: v1.x to v2.0

This guide will help you migrate from the previous version of the ChatGPT Twitch Bot to version 2.0.

## What's New in v2.0

### Major Changes
- **TwitchIO Integration**: Replaced tmi.js with TwitchIO for better Twitch API integration
- **Subscription Management**: Added support for subscriber-only bot access
- **Enhanced OpenAI Integration**: Support for all latest OpenAI API parameters
- **Improved Configuration**: Centralized configuration management
- **New API Endpoints**: Additional endpoints for external integrations

### New Features
- Subscription verification and control
- Configurable AI parameters (temperature, max tokens, etc.)
- Better error handling and graceful shutdown
- Configuration validation
- Bot statistics and monitoring

## Migration Steps

### 1. Update Dependencies

The bot now uses different dependencies. Update your `package.json`:

**Old dependencies:**
```json
{
  "tmi.js": "^1.8.5",
  "openai": "^4.20.1"
}
```

**New dependencies:**
```json
{
  "twitchio": "^2.8.3",
  "openai": "^4.28.0",
  "dotenv": "^16.3.1"
}
```

### 2. Environment Variables

#### New Required Variables (for subscription features)

If you want to use subscription features, add these variables:

```bash
# Twitch Application Credentials
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Subscription Control
SUBSCRIBERS_ONLY=false
MODERATORS_BYPASS=true
```

#### New Optional Variables

```bash
# OpenAI Configuration
TEMPERATURE=1.0
MAX_TOKENS=150
TOP_P=1.0
FREQUENCY_PENALTY=0.5
PRESENCE_PENALTY=0.0

# Bot Configuration
MAX_MESSAGE_LENGTH=399
```

#### Updated Default Values

Some default values have changed:

- `MODEL_NAME`: Now defaults to `gpt-4o-mini` (was `gpt-3.5-turbo`)
- `MAX_TOKENS`: Now defaults to `150` (was `60`)

### 3. File Structure Changes

#### New Files
- `config.js` - Centralized configuration management
- `twitch_bot_v2.js` - New TwitchIO-based bot implementation
- `TWITCH_SETUP.md` - Twitch setup documentation
- `env.example` - Environment variables example

#### Updated Files
- `index.js` - Updated to use new configuration and bot
- `openai_operations.js` - Updated to use new OpenAI parameters
- `package.json` - Updated dependencies and version
- `README.md` - Updated documentation

### 4. Configuration Changes

#### Old Configuration (v1.x)
```javascript
// Old way - direct environment variable access
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL_NAME = process.env.MODEL_NAME || 'gpt-3.5-turbo';
```

#### New Configuration (v2.0)
```javascript
// New way - centralized configuration
import { OPENAI_CONFIG, TWITCH_CONFIG, BOT_CONFIG } from './config.js';

// Access configuration
const apiKey = OPENAI_CONFIG.API_KEY;
const modelName = OPENAI_CONFIG.MODEL_NAME;
```

### 5. Bot Implementation Changes

#### Old Bot (tmi.js)
```javascript
import { TwitchBot } from './twitch_bot.js';

const bot = new TwitchBot(username, oauth, channels, apiKey, enableTTS);
bot.connect();
```

#### New Bot (TwitchIO)
```javascript
import { TwitchBotV2 } from './twitch_bot_v2.js';

const bot = new TwitchBotV2();
await bot.initialize();
```

### 6. API Endpoints

#### New Endpoints Available

- `GET /subscriber/:username` - Check user subscription status
- `GET /stats` - Get bot statistics
- `POST /reset-history` - Reset conversation history

#### Existing Endpoints

The `/gpt/:text` endpoint remains the same for backward compatibility.

## Testing Your Migration

### 1. Local Testing

1. Install new dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (use `env.example` as a template)

3. Test basic functionality:
   ```bash
   npm start
   ```

4. Test subscription features (if enabled):
   - Try using the bot as a subscriber
   - Try using the bot as a non-subscriber
   - Check the new API endpoints

### 2. Deployment Testing

1. Update your Render deployment with the new code
2. Set the new environment variables in Render
3. Monitor the logs for any errors
4. Test all functionality in your live environment

## Rollback Plan

If you encounter issues with v2.0, you can rollback to v1.x:

1. Revert to the previous commit
2. Restore the old `package.json`
3. Remove any new environment variables
4. Restart your deployment

## Common Issues and Solutions

### Issue: Bot not connecting
**Solution**: Check that your OAuth token is valid and not expired

### Issue: Subscription features not working
**Solution**: Ensure you've set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`

### Issue: OpenAI API errors
**Solution**: Check that your API key is valid and has sufficient credits

### Issue: Configuration validation fails
**Solution**: Review the error messages and ensure all required variables are set

## Support

If you encounter issues during migration:

1. Check the logs for specific error messages
2. Verify all environment variables are set correctly
3. Test with a minimal configuration first
4. Join our Discord community: https://discord.gg/pcxybrpDx6

## Benefits of v2.0

After migration, you'll have access to:

- **Better Twitch Integration**: More reliable connection and event handling
- **Subscription Control**: Restrict bot usage to subscribers
- **Enhanced AI Responses**: Fine-tune AI parameters for better responses
- **Improved Monitoring**: Better logging and error handling
- **Future-Proof**: Built on the latest APIs and libraries

## Next Steps

After successful migration:

1. Explore the new subscription features
2. Experiment with the new OpenAI parameters
3. Set up monitoring for the new API endpoints
4. Consider enabling subscription-only mode for your channel 