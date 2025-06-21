# Twitch Setup Guide for v2.0

This guide will help you set up the Twitch integration for the ChatGPT Twitch Bot v2.0, including the new subscription features.

## Basic Twitch Setup

### 1. Get OAuth Token

1. Go to https://twitchapps.com/tmi/
2. Click "Connect with Twitch"
3. Authorize the application
4. Copy the OAuth token (it starts with `oauth:`)
5. Set this as your `TWITCH_AUTH` environment variable

⚠️ **Important**: This token may expire after a few days. You'll need to regenerate it periodically.

### 2. Set Bot Username

Set the `TWITCH_USER` environment variable to your bot's username (without the `oauth:` prefix).

### 3. Set Channels

Set the `CHANNELS` environment variable to a comma-separated list of channels where your bot should join (e.g., `channel1,channel2`).

## Advanced Setup (Required for Subscription Features)

If you want to use the subscription-only features, you need to create a Twitch application and get additional credentials.

### 1. Create Twitch Application

1. Go to https://dev.twitch.tv/console
2. Log in with your Twitch account
3. Click "Register Your Application"
4. Fill in the following details:
   - **Name**: Your bot name (e.g., "My ChatGPT Bot")
   - **OAuth Redirect URLs**: `http://localhost:3000` (for local testing) or your Render URL
   - **Category**: Chat Bot
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### 2. Set Environment Variables

Set these new environment variables:

- `TWITCH_CLIENT_ID`: Your Twitch application Client ID
- `TWITCH_CLIENT_SECRET`: Your Twitch application Client Secret

### 3. Enable Subscription Features

Set these environment variables to enable subscription control:

- `SUBSCRIBERS_ONLY=true` - Restricts bot usage to subscribers only
- `MODERATORS_BYPASS=true` - Allows moderators to bypass subscription restrictions

## Subscription Features

### How It Works

When `SUBSCRIBERS_ONLY` is enabled:

1. **Subscribers**: Can use the bot normally
2. **Moderators**: Can use the bot if `MODERATORS_BYPASS` is enabled
3. **Regular viewers**: Will receive a message explaining that the bot is subscriber-only

### API Endpoints

The bot provides several API endpoints for subscription management:

#### Check User Subscription Status
```
GET /subscriber/:username
```

Response:
```json
{
  "username": "example_user",
  "isSubscriber": true,
  "isModerator": false,
  "hasAccess": true
}
```

#### Get Bot Statistics
```
GET /stats
```

Response:
```json
{
  "subscriberCount": 5,
  "moderatorCount": 2,
  "subscribersOnly": true,
  "moderatorsBypass": true
}
```

#### Reset Conversation History
```
POST /reset-history
```

Response:
```json
{
  "message": "Conversation history reset successfully"
}
```

## Troubleshooting

### Common Issues

1. **Bot not connecting**: Check your OAuth token and make sure it's valid
2. **Subscription features not working**: Ensure you've set `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`
3. **Permission denied**: Make sure your bot has the necessary permissions in the channel

### OAuth Token Expiration

If your bot stops working, your OAuth token may have expired. To fix this:

1. Go to https://twitchapps.com/tmi/
2. Generate a new token
3. Update your `TWITCH_AUTH` environment variable
4. Restart your bot

### Twitch API Rate Limits

The bot respects Twitch's rate limits. If you encounter rate limit errors:

1. Reduce the frequency of bot commands
2. Increase the `COOLDOWN_DURATION` environment variable
3. Check Twitch's API status at https://status.twitch.tv/

## Security Considerations

1. **Never share your OAuth token or Client Secret**
2. **Use environment variables** instead of hardcoding credentials
3. **Regularly rotate your tokens** for better security
4. **Monitor your bot's activity** to ensure it's working as expected

## Testing

To test your setup:

1. Start your bot
2. Join a test channel
3. Try using the bot command (e.g., `!gpt hello`)
4. If subscription features are enabled, test with both subscribers and non-subscribers

## Support

If you encounter issues:

1. Check the bot logs for error messages
2. Verify all environment variables are set correctly
3. Join our Discord community: https://discord.gg/pcxybrpDx6
4. Check the main README.md for additional troubleshooting tips 