import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();

// OpenAI Configuration
export const OPENAI_CONFIG = {
    API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL_NAME: process.env.MODEL_NAME || 'gpt-4o-mini',
    TEMPERATURE: parseFloat(process.env.TEMPERATURE) || 1.0,
    MAX_TOKENS: parseInt(process.env.MAX_TOKENS) || 150,
    TOP_P: parseFloat(process.env.TOP_P) || 1.0,
    FREQUENCY_PENALTY: parseFloat(process.env.FREQUENCY_PENALTY) || 0.5,
    PRESENCE_PENALTY: parseFloat(process.env.PRESENCE_PENALTY) || 0.0,
    HISTORY_LENGTH: parseInt(process.env.HISTORY_LENGTH) || 5
};

// Twitch Configuration
export const TWITCH_CONFIG = {
    USERNAME: process.env.TWITCH_USER || 'oSetinhasBot',
    OAUTH_TOKEN: process.env.TWITCH_AUTH || '',
    CLIENT_ID: process.env.TWITCH_CLIENT_ID || '',
    CLIENT_SECRET: process.env.TWITCH_CLIENT_SECRET || '',
    CHANNELS: process.env.CHANNELS ? process.env.CHANNELS.split(',').map(channel => channel.trim()) : ['oSetinhas'],
    SUBSCRIBERS_ONLY: process.env.SUBSCRIBERS_ONLY === 'true' || false,
    MODERATORS_BYPASS: process.env.MODERATORS_BYPASS === 'true' || true
};

// Bot Configuration
export const BOT_CONFIG = {
    GPT_MODE: process.env.GPT_MODE || 'CHAT',
    COMMAND_NAME: process.env.COMMAND_NAME ? process.env.COMMAND_NAME.split(',').map(cmd => cmd.trim().toLowerCase()) : ['!gpt'],
    SEND_USERNAME: process.env.SEND_USERNAME === 'true' || true,
    ENABLE_TTS: process.env.ENABLE_TTS === 'true' || false,
    ENABLE_CHANNEL_POINTS: process.env.ENABLE_CHANNEL_POINTS === 'true' || false,
    COOLDOWN_DURATION: parseInt(process.env.COOLDOWN_DURATION) || 10,
    MAX_MESSAGE_LENGTH: parseInt(process.env.MAX_MESSAGE_LENGTH) || 399
};

// Server Configuration
export const SERVER_CONFIG = {
    PORT: parseInt(process.env.PORT) || 3000
};

// Load context file
export const getFileContext = () => {
    try {
        return fs.readFileSync('./file_context.txt', 'utf8');
    } catch (error) {
        console.warn('Could not read file_context.txt, using default context');
        return 'You are a helpful Twitch Chatbot.';
    }
};

// Validation
export const validateConfig = () => {
    const errors = [];
    
    if (!OPENAI_CONFIG.API_KEY) {
        errors.push('OPENAI_API_KEY is required');
    }
    
    if (!TWITCH_CONFIG.OAUTH_TOKEN) {
        errors.push('TWITCH_AUTH is required');
    }
    
    if (TWITCH_CONFIG.SUBSCRIBERS_ONLY && (!TWITCH_CONFIG.CLIENT_ID || !TWITCH_CONFIG.CLIENT_SECRET)) {
        errors.push('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required when SUBSCRIBERS_ONLY is enabled');
    }
    
    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        return false;
    }
    
    return true;
}; 